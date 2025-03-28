import asyncio
from collections import OrderedDict
from dataclasses import dataclass, field
import time, importlib, inspect, os, json
import token
from typing import Any, Awaitable, Optional, Dict, TypedDict
import uuid
import models

from langchain_core.prompt_values import ChatPromptValue
from python.helpers import extract_tools, rate_limiter, files, errors, history, tokens
from python.helpers.print_style import PrintStyle
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.language_models.llms import BaseLLM
from langchain_core.embeddings import Embeddings
import python.helpers.log as Log
from python.helpers.dirty_json import DirtyJson
from python.helpers.defer import DeferredTask
from typing import Callable


class AgentContext:

    _contexts: dict[str, "AgentContext"] = {}
    _counter: int = 0

    def __init__(
        self,
        config: "AgentConfig",
        id: str | None = None,
        name: str | None = None,
        agent0: "Agent|None" = None,
        log: Log.Log | None = None,
        paused: bool = False,
        streaming_agent: "Agent|None" = None,
    ):
        # build context
        self.id = id or str(uuid.uuid4())
        self.name = name
        self.config = config
        self.log = log or Log.Log()
        self.agent0 = agent0 or Agent(0, self.config, self)
        self.paused = paused
        self.streaming_agent = streaming_agent
        self.process: DeferredTask | None = None
        AgentContext._counter += 1
        self.no = AgentContext._counter

        existing = self._contexts.get(self.id, None)
        if existing:
            AgentContext.remove(self.id)
        self._contexts[self.id] = self

    @staticmethod
    def get(id: str):
        return AgentContext._contexts.get(id, None)

    @staticmethod
    def first():
        if not AgentContext._contexts:
            return None
        return list(AgentContext._contexts.values())[0]

    @staticmethod
    def remove(id: str):
        context = AgentContext._contexts.pop(id, None)
        if context and context.process:
            context.process.kill()
        return context

    def kill_process(self):
        if self.process:
            self.process.kill()

    def reset(self):
        self.kill_process()
        self.log.reset()
        self.agent0 = Agent(0, self.config, self)
        self.streaming_agent = None
        self.paused = False

    def nudge(self):
        self.kill_process()
        self.paused = False
        if self.streaming_agent:
            current_agent = self.streaming_agent
        else:
            current_agent = self.agent0

        self.process = DeferredTask(current_agent.monologue)
        return self.process
    def communicate(self, msg: "UserMessage", broadcast_level: int = 1):
        self.paused = False  # unpause if paused

        if self.streaming_agent:
            current_agent = self.streaming_agent
        else:
            current_agent = self.agent0

        if self.process and self.process.is_alive():
            # set intervention messages to agent(s):
            intervention_agent = current_agent
            while intervention_agent and broadcast_level != 0:
                intervention_agent.intervention = msg
                broadcast_level -= 1
                intervention_agent = intervention_agent.data.get(Agent.DATA_NAME_SUPERIOR, None)
        else:

            # self.process = DeferredTask(current_agent.monologue, msg)
            self.process = DeferredTask(self._process_chain, current_agent, msg)

        return self.process

    # this wrapper ensures that superior agents are called back if the chat was loaded from file and original callstack is gone
    async def _process_chain(self, agent: "Agent", msg: str, user=True):
        try:
            msg_template = (
                await agent.hist_add_user_message(msg)
                if user
                else await agent.hist_add_tool_result(
                    tool_name="call_subordinate", tool_result=msg
                )
            )
            response = await agent.monologue()
            superior = agent.data.get(Agent.DATA_NAME_SUPERIOR, None)
            if superior:
                response = await self._process_chain(superior, response, False)
            return response
        except Exception as e:
            agent.handle_critical_exception(e)


@dataclass
class ModelConfig:
    provider: models.ModelProvider
    name: str
    ctx_length: int
    limit_requests: int
    limit_input: int
    limit_output: int
    kwargs: dict


@dataclass
class AgentConfig:
    chat_model: ModelConfig
    utility_model: ModelConfig
    embeddings_model: ModelConfig
    prompts_subdir: str = ""
    memory_subdir: str = ""
    knowledge_subdirs: list[str] = field(default_factory=lambda: ["default", "custom"])
    code_exec_docker_enabled: bool = False
    code_exec_docker_name: str = "A0-dev"
    code_exec_docker_image: str = "synotechai/syno-ai-run:development"
    code_exec_docker_ports: dict[str, int] = field(
        default_factory=lambda: {"22/tcp": 55022, "80/tcp": 55080}
    )
    code_exec_docker_volumes: dict[str, dict[str, str]] = field(
        default_factory=lambda: {
            files.get_base_dir(): {"bind": "/a0", "mode": "rw"},
            files.get_abs_path("work_dir"): {"bind": "/root", "mode": "rw"},
        }
    )
    code_exec_ssh_enabled: bool = True
    code_exec_ssh_addr: str = "localhost"
    code_exec_ssh_port: int = 55022
    code_exec_ssh_user: str = "root"
    code_exec_ssh_pass: str = ""
    additional: Dict[str, Any] = field(default_factory=dict)


class LoopData:
    def __init__(self, **kwargs):
        self.iteration = -1
        self.system = []
        self.user_message: history.Message | None = None
        self.history_output: list[history.OutputMessage] = []
        self.last_response = ""
        self.attachments = []  # Add attachments field

        # override values with kwargs
        for key, value in kwargs.items():
            setattr(self, key, value)


# intervention exception class - skips rest of message loop iteration
class InterventionException(Exception):
    pass


# killer exception class - not forwarded to LLM, cannot be fixed on its own, ends message loop
class RepairableException(Exception):
    pass


class HandledException(Exception):
    pass


class Agent:

    DATA_NAME_SUPERIOR = "_superior"
    DATA_NAME_SUBORDINATE = "_subordinate"
    DATA_NAME_CTX_WINDOW = "ctx_window"

    def __init__(
        self, number: int, config: AgentConfig, context: AgentContext | None = None
    ):

        # agent config
        self.config = config

        # agent context
        self.context = context or AgentContext(config)

        # non-config vars
        self.number = number
        self.agent_name = f"Agent {self.number}"

        self.history = history.History(self)
        self.last_user_message: history.Message | None = None
        self.intervention_message = ""
        self.rate_limiter = rate_limiter.RateLimiter(
            self.context.log,
            max_calls=self.config.rate_limit_requests,
            max_input_tokens=self.config.rate_limit_input_tokens,
            max_output_tokens=self.config.rate_limit_output_tokens,
            window_seconds=self.config.rate_limit_seconds,
        )
        self.data = {}  # free data object all the tools can use

    async def monologue(self):
        while True:
            try:
                # loop data dictionary to pass to extensions
                self.loop_data = LoopData(user_message=self.last_user_message)
                # call monologue_start extensions
                await self.call_extensions("monologue_start", loop_data=self.loop_data)

                printer = PrintStyle(italic=True, font_color="#b3ffd9", padding=False)

                # # Include attachments in user message if available
                # if loop_data.attachments:
                #     user_message += "\n" + "\n".join(
                #         loop_data.attachments
                #     )  # Add attachments to message
                #     loop_data.attachments = (
                #         []
                #     )  # Clear attachments after adding to message
                # TODO attachments to extension

                # await self.hist_add_user_message(message=self.loop_data.message)

                # let the agent run message loop until he stops it with a response tool
                while True:

                    self.context.streaming_agent = self  # mark self as current streamer
                    self.loop_data.iteration += 1

                    try:

                        # set system prompt and message history
                        self.loop_data.system = []
                        self.loop_data.history_output = self.history.output()

                        # and allow extensions to edit them
                        await self.call_extensions(
                            "message_loop_prompts", loop_data=self.loop_data
                        )

                        # build chain from system prompt, message history and model
                        prompt = ChatPromptTemplate.from_messages(
                            [
                                SystemMessage(
                                    content="\n\n".join(self.loop_data.system)
                                ),
                                MessagesPlaceholder(variable_name="messages"),
                            ]
                        )
                        chain = prompt | self.config.chat_model

                        # convert history to LLM format
                        history_langchain = history.output_langchain(
                            self.loop_data.history_output
                        )

                        # rate limiter TODO - move to extension, make per-model
                        formatted_inputs = prompt.format(messages=history_langchain)
                        self.set_data(self.DATA_NAME_CTX_WINDOW, formatted_inputs)
                        token_count = tokens.approximate_tokens(formatted_inputs)
                        self.rate_limiter.limit_call_and_input(token_count)

                        # output that the agent is starting
                        PrintStyle(
                            bold=True,
                            font_color="green",
                            padding=True,
                            background_color="white",
                        ).print(f"{self.agent_name}: Generating")
                        log = self.context.log.log(
                            type="agent", heading=f"{self.agent_name}: Generating"
                        )

                        async for chunk in chain.astream(
                            {"messages": history_langchain}
                        ):
                            # wait for intervention and handle it, if paused
                            await self.handle_intervention(agent_response)

                        # store as last context window content
                        self.set_data(Agent.DATA_NAME_CTX_WINDOW, prompt.format())

                        agent_response = await self.call_chat_model(
                            prompt, callback=stream_callback
                        )

                        await self.handle_intervention(agent_response)

                        if (
                            self.loop_data.last_response == agent_response
                        ):  # if assistant_response is the same as last message in history, let him know
                            # Append the assistant's response to the history
                            await self.hist_add_ai_response(agent_response)
                            # Append warning message to the history
                            warning_msg = self.read_prompt("fw.msg_repeat.md")
                            await self.hist_add_warning(message=warning_msg)
                            PrintStyle(font_color="orange", padding=True).print(
                                warning_msg
                            )
                            self.context.log.log(type="warning", content=warning_msg)

                        else:  # otherwise proceed with tool
                            # Append the assistant's response to the history
                            await self.hist_add_ai_response(agent_response)
                            # process tools requested in agent message
                            tools_result = await self.process_tools(agent_response)
                            if tools_result:  # final response of message loop available
                                return tools_result  # break the execution if the task is done

                    # exceptions inside message loop:
                    except InterventionException as e:
                        pass  # intervention message has been handled in handle_intervention(), proceed with conversation loop
                    except RepairableException as e:
                        # Forward repairable errors to the LLM, maybe it can fix them
                        error_message = errors.format_error(e)
                        await self.hist_add_warning(error_message)
                        PrintStyle(font_color="red", padding=True).print(error_message)
                        self.context.log.log(type="error", content=error_message)
                    except Exception as e:
                        # Other exception kill the loop
                        self.handle_critical_exception(e)

                    finally:
                        # call message_loop_end extensions
                        await self.call_extensions(
                            "message_loop_end", loop_data=self.loop_data
                        )

            # exceptions outside message loop:
            except InterventionException as e:
                pass  # just start over
            except Exception as e:
                self.handle_critical_exception(e)
            finally:
                self.context.streaming_agent = None  # unset current streamer
                # call monologue_end extensions
                await self.call_extensions("monologue_end", loop_data=self.loop_data)  # type: ignore

    def handle_critical_exception(self, exception: Exception):
        if isinstance(exception, HandledException):
            raise exception  # Re-raise the exception to kill the loop
        elif isinstance(exception, asyncio.CancelledError):
            # Handling for asyncio.CancelledError
            PrintStyle(font_color="white", background_color="red", padding=True).print(
                f"Context {self.context.id} terminated during message loop"
            )
            raise HandledException(
                exception
            )  # Re-raise the exception to cancel the loop
        else:
            # Handling for general exceptions
            error_text = errors.error_text(exception)
            error_message = errors.format_error(exception)
            PrintStyle(font_color="red", padding=True).print(error_message)
            self.context.log.log(
                type="error",
                heading="Error",
                content=error_message,
                kvps={"text": error_text},
            )
            raise HandledException(exception)  # Re-raise the exception to kill the loop

    def parse_prompt(self, file: str, **kwargs) -> tuple[list, dict]:
        prompt_dir = files.get_abs_path("prompts/default")
        backup_dir = []
        if (
            self.config.prompts_subdir
        ):  # if agent has custom folder, use it and use default as backup
            prompt_dir = files.get_abs_path("prompts", self.config.prompts_subdir)
            backup_dir.append(files.get_abs_path("prompts/default"))
        prompt = files.parse_file(
            files.get_abs_path(prompt_dir, file), _backup_dirs=backup_dir, **kwargs
        )
        if isinstance(prompt, dict):
            return [], prompt
        elif isinstance(prompt, list):
            return prompt, {}
        else:
            return [prompt], {}

    def read_prompt(self, file: str, **kwargs) -> str:
        prompt_dir = files.get_abs_path("prompts/default")
        backup_dir = []
        if (
            self.config.prompts_subdir
        ):  # if agent has custom folder, use it and use default as backup
            prompt_dir = files.get_abs_path("prompts", self.config.prompts_subdir)
            backup_dir.append(files.get_abs_path("prompts/default"))
        prompt = files.read_file(
            files.get_abs_path(prompt_dir, file), _backup_dirs=backup_dir, **kwargs
        )
        prompt = files.remove_code_fences(prompt)
        return prompt

    def get_data(self, field: str):
        return self.data.get(field, None)

    def set_data(self, field: str, value):
        self.data[field] = value

    async def hist_add_user_message(self, message: str, intervention: bool = False):
        self.history.new_topic()  # user message starts a new topic in history
        if intervention:
            args, kwargs = self.parse_prompt("fw.intervention.md", message=message)
            msg = self.history.add_message(False, *args, **kwargs)
        else:
            args, kwargs = self.parse_prompt("fw.user_message.md", message=message)
            msg = self.history.add_message(False, *args, **kwargs)
        self.last_user_message = msg
        return msg

    async def hist_add_ai_response(self, message: str):
        self.loop_data.last_response = message
        args, kwargs = self.parse_prompt("fw.ai_response.md", message=message)
        return self.history.add_message(True, *args, **kwargs)

    async def hist_add_warning(self, message: str):
        args, kwargs = self.parse_prompt("fw.warning.md", message=message)
        return self.history.add_message(False, *args, **kwargs)

    async def hist_add_tool_result(self, tool_name: str, tool_result: str):
        args, kwargs = self.parse_prompt(
            "fw.tool_result.md", tool_name=tool_name, tool_result=tool_result
        )
        return self.history.add_message(False, *args, **kwargs)

    def concat_messages(
        self, messages
    ):  # TODO add param for message range, topic, history
        return self.history.output_text(human_label="user", ai_label="assistant")

    async def call_utility_model(
        self,
        system: str,
        message: str,
        callback: Callable[[str], Awaitable[None]] | None = None,
        background: bool = False,
    ):
        prompt = ChatPromptTemplate.from_messages(
            [SystemMessage(content=system), HumanMessage(content=message)]
        )

        response = ""

        # model class
        model = models.get_model(
            models.ModelType.CHAT,
            self.config.utility_model.provider,
            self.config.utility_model.name,
            **self.config.utility_model.kwargs,
        )

        # rate limiter
        limiter = await self.rate_limiter(
            self.config.utility_model, prompt.format(), background
        )

        async for chunk in (prompt | model).astream({}):
            await self.handle_intervention()  # wait for intervention and handle it, if paused

            content = models.parse_chunk(chunk)
            limiter.add(output=tokens.approximate_tokens(content))
            response += content

            if callback:
                await callback(content)

        return response

    async def replace_middle_messages(self, middle_messages):
        cleanup_prompt = self.read_prompt("fw.msg_cleanup.md")
        log_item = self.context.log.log(
            type="util", heading="Mid messages cleanup summary"
        )

        PrintStyle(
            bold=True, font_color="orange", padding=True, background_color="white"
        ).print(f"{self.agent_name}: Mid messages cleanup summary")
        printer = PrintStyle(italic=True, font_color="orange", padding=False)

        def log_callback(content):
            printer.stream(content)
            log_item.stream(content=content)

        summary = await self.call_utility_llm(
            system=cleanup_prompt,
            msg=self.concat_messages(middle_messages),
            callback=log_callback,
        )
        new_human_message = HumanMessage(content=summary)
        return [new_human_message]

    async def cleanup_history(self, max: int, keep_start: int, keep_end: int):
        # if len(self.history) <= max:
        #     return self.history

        # first_x = self.history[:keep_start]
        # last_y = self.history[-keep_end:]

        # # Identify the middle part
        # middle_part = self.history[keep_start:-keep_end]

        # # Ensure the first message in the middle is "human", if not, move one message back
        # if middle_part and middle_part[0].type != "human":
        #     if len(first_x) > 0:
        #         middle_part.insert(0, first_x.pop())

        # # Ensure the middle part has an odd number of messages
        # if len(middle_part) % 2 == 0:
        #     middle_part = middle_part[:-1]

        # # Replace the middle part using the replacement function
        # new_middle_part = await self.replace_middle_messages(middle_part)

        # self.history = first_x + new_middle_part + last_y

        return self.history

    async def handle_intervention(self, progress: str = ""):
        while self.context.paused:
            await asyncio.sleep(0.1)  # wait if paused
        if (
            self.intervention
        ):  # if there is an intervention message, but not yet processed
            msg = self.intervention
            self.intervention = None  # reset the intervention message
            if progress.strip():
                await self.hist_add_ai_response(progress)
            # append the intervention message
            await self.hist_add_user_message(msg, intervention=True)
            raise InterventionException(msg)

    async def process_tools(self, msg: str):
        # search for tool usage requests in agent message
        tool_request = extract_tools.json_parse_dirty(msg)

        if tool_request is not None:
            tool_name = tool_request.get("tool_name", "")
            tool_args = tool_request.get("tool_args", {})
            tool = self.get_tool(tool_name, tool_args, msg)

            await self.handle_intervention()  # wait if paused and handle intervention message if needed
            await tool.before_execution(**tool_args)
            await self.handle_intervention()  # wait if paused and handle intervention message if needed
            response = await tool.execute(**tool_args)
            await self.handle_intervention()  # wait if paused and handle intervention message if needed
            await tool.after_execution(response)
            await self.handle_intervention()  # wait if paused and handle intervention message if needed
            if response.break_loop:
                return response.message
        else:
            msg = self.read_prompt("fw.msg_misformat.md")
            await self.hist_add_warning(msg)
            PrintStyle(font_color="red", padding=True).print(msg)
            self.context.log.log(
                type="error", content=f"{self.agent_name}: Message misformat"
            )

    def log_from_stream(self, stream: str, logItem: Log.LogItem):
        try:
            if len(stream) < 25:
                return  # no reason to try
            response = DirtyJson.parse_string(stream)
            if isinstance(response, dict):
                # log if result is a dictionary already
                logItem.update(content=stream, kvps=response)
        except Exception as e:
            pass

    def get_tool(self, name: str, args: dict, message: str, **kwargs):
        from python.tools.unknown import Unknown
        from python.helpers.tool import Tool

        classes = extract_tools.load_classes_from_folder(
            "python/tools", name + ".py", Tool
        )
        tool_class = classes[0] if classes else Unknown
        return tool_class(agent=self, name=name, args=args, message=message, **kwargs)

    async def call_extensions(self, folder: str, **kwargs) -> Any:
        from python.helpers.extension import Extension

        classes = extract_tools.load_classes_from_folder(
            "python/extensions/" + folder, "*", Extension
        )
        for cls in classes:
            await cls(agent=self).execute(**kwargs)
