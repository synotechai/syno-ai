import google.generativeai as genai
from typing import List, Optional
from workflow.core.data_structures import (
    MessageDict,
    ModelConfig,
    FileReference,
    get_file_content,
    References,
    RoleTypes,
    MessageGenerators,
    ContentType,
    MetadataDict,
)
from workflow.core.api.engines.vision_engines.vision_model_engine import (
    VisionModelEngine,
)
from workflow.util import LOGGER


class GeminiVisionEngine(VisionModelEngine):
    async def generate_api_response(
        self,
        api_data: ModelConfig,
        file_references: List[FileReference],
        prompt: str,
        max_tokens: Optional[int] = None,
    ) -> References:
        """
        Analyzes images using Google's Gemini vision model.

        Args:
            api_data (ModelConfig): Configuration data for the API (e.g., model name, API key).
            file_references (List[FileReference]): List of FileReference objects for the images to analyze.
            prompt (str): A text prompt to guide the image analysis.
            max_tokens (Optional[int]): The maximum number of tokens to generate.

        Returns:
            References: Analysis results wrapped in a References object.
        """
        genai.configure(api_key=api_data.api_key)
        model = genai.GenerativeModel(api_data.model)

        content = [prompt]
        for file_ref in file_references:
            image_data = get_file_content(file_ref)
            LOGGER.debug(
                f"File type: {file_ref.type}, Data type: {type(image_data)}, Data size: {len(image_data)} bytes"
            )

            try:
                image = genai.Image.from_bytes(image_data)
                content.append(image)
            except Exception as e:
                LOGGER.warning(
                    f"Failed to process image data for file {file_ref.filename}: {str(e)}"
                )

        try:
            response = model.generate_content(
                content,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=max_tokens
                ),
            )
            creation_metadata = MetadataDict(
                model=api_data.model,
                usage={
                    "prompt_tokens": response.usage_metadata.prompt_token_count,
                    "completion_tokens": response.usage_metadata.candidates_token_count,
                    "total_tokens": response.usage_metadata.total_token_count,
                },
                costs=self.calculate_cost(
                    response.usage_metadata.prompt_token_count,
                    response.usage_metadata.candidates_token_count,
                    api_data,
                ),
                finish_reason=response.candidates[0].finish_reason.name,
            )

            msg = MessageDict(
                role=RoleTypes.ASSISTANT,
                content=response.text,
                generated_by=MessageGenerators.TOOL,
                type=ContentType.TEXT,
                creation_metadata=creation_metadata,
            )
            return References(messages=[msg])
        except Exception as e:
            raise Exception(f"Error in Gemini vision model API call: {str(e)}")
