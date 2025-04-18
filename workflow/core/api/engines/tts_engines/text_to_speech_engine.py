import base64
from typing import List
from pydantic import Field
from openai import AsyncOpenAI
from workflow.core.data_structures import (
    ModelConfig,
    ApiType,
    FileContentReference,
    MessageDict,
    ContentType,
    FileType,
    References,
    FunctionParameters,
    ParameterDefinition,
    RoleTypes,
    MessageGenerators,
)
from workflow.core.api.engines.api_engine import APIEngine
from workflow.util import LOGGER, get_traceback, TextSplitter, Language, LengthType


class TextToSpeechEngine(APIEngine):
    """
    Text-to-speech API engine implementing the OpenAI TTS interface.

    Defines the standard interface for text-to-speech conversion,
    including automatic text splitting for long inputs. Features:
    - Multiple voice options
    - Speed control
    - Automatic chunking for long texts

    Input Interface:
        - input: Text to convert to speech
        - voice: Voice identifier to use
        - speed: Speech rate control

    Returns:
        References object containing FileContentReference with:
        - Generated audio in base64 format
        - Original text and generation parameters
        - Model and voice metadata

    Note:
        Handles text splitting and multiple file generation when
        input exceeds model context limits, maintaining consistent
        voice and speed across segments.
    """

    input_variables: FunctionParameters = Field(
        default=FunctionParameters(
            type="object",
            properties={
                "input": ParameterDefinition(
                    type="string", description="The text to convert to speech."
                ),
                "voice": ParameterDefinition(
                    type="string",
                    description="The voice to use for the speech.",
                    default="alloy",
                ),
                "speed": ParameterDefinition(
                    type="number", description="The speed of the speech.", default=1.0
                ),
            },
            required=["input"],
        )
    )
    required_api: ApiType = Field(
        ApiType.TEXT_TO_SPEECH, title="The API engine required"
    )

    async def generate_api_response(
        self,
        api_data: ModelConfig,
        input: str,
        voice: str = "alloy",
        speed: float = 1.0,
        **kwargs,
    ) -> References:
        """
        Converts text to speech using OpenAI's API and creates a FileContentReference.
        Args:
            api_data (ModelConfig): Configuration data for the API (e.g., API key, base URL).
            input (str): The text to convert to speech.
            model (str): The name of the text-to-speech model to use.
            voice (str): The voice to use for the speech.
            output_filename (Optional[str]): The filename for the generated audio file. If None, a descriptive name will be generated.
        Returns:
            References: A message dict containing information about the generated audio file.
        """
        client = AsyncOpenAI(api_key=api_data.api_key, base_url=api_data.base_url)
        model = api_data.model
        inputs: List[str] = []
        if len(input) > api_data.ctx_size:
            splitter = TextSplitter(
                language=Language.TEXT,
                chunk_size=api_data.ctx_size,
                length_function=LengthType.CHARACTER,
            )
            inputs = splitter.split_text(input)
        else:
            inputs.append(input)
        responses: List[FileContentReference | MessageDict] = [
            await self.api_call(client, api_data, input, voice, speed, model, index)
            for index, input in enumerate(inputs)
        ]
        files = [r for r in responses if isinstance(r, FileContentReference)]
        messages = [r for r in responses if isinstance(r, MessageDict)]
        return References(files=files, messages=messages)

    async def api_call(
        self,
        client: AsyncOpenAI,
        api_data: ModelConfig,
        input: str,
        voice: str = "alloy",
        speed: float = 1.0,
        model: str = None,
        index: int = 0,
    ) -> FileContentReference | MessageDict:
        try:
            LOGGER.debug(
                f"Generating speech with model {model}, voice {voice}, speed {speed}"
            )
            response = await client.audio.speech.create(
                model=model, voice=voice, input=input, speed=float(speed)
            )

            # Get the raw audio data
            audio_data = response.read()

            # Generate filename if not provided
            output_filename = self.generate_filename(
                input, model + voice, index if index != 0 else None, "mp3"
            )

            creation_metadata = {
                "model": model,
                "generation_details": {
                    "voice": voice,
                    "input_text_length": len(input),
                },
                "cost": {
                    "total_cost": (api_data.model_costs.cost_per_unit or 0) * len(input)
                },
            }
            # Create a FileContentReference
            file_reference = FileContentReference(
                filename=output_filename,
                type=FileType.AUDIO,
                content=base64.b64encode(audio_data).decode("utf-8"),
                transcript=MessageDict(
                    role=RoleTypes.TOOL,
                    content=f"Speech generated by model {model}. \n\nInput: '{input}' \n\nVoice: {voice}",
                    type=ContentType.TEXT,
                    generated_by=MessageGenerators.TOOL,
                    creation_metadata=creation_metadata,
                ),
            )
            return file_reference

        except Exception as e:
            LOGGER.error(f"Error generating speech: {get_traceback()}")
            LOGGER.error(f"Error in OpenAI text-to-speech API call: {str(e)}")
            return MessageDict(
                role=RoleTypes.TOOL,
                content=f"Error in OpenAI text-to-speech API call: {str(e)}\n\nInput: '{input}' - Model: {model} - Voice: {voice}\n\n"
                + get_traceback(),
                generated_by=MessageGenerators.SYSTEM,
            )
