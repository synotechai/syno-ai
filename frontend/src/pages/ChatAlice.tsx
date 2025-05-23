import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Box, SelectChangeEvent } from '@mui/material';
import { Add, HourglassBottom, Info, } from '@mui/icons-material';
import { AliceTask, PopulatedTask } from '../types/TaskTypes';
import { AliceChat, PopulatedAliceChat } from '../types/ChatTypes';
import { TASK_SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from '../utils/Constants';
import { useChat } from '../contexts/ChatContext';
import { useDialog } from '../contexts/DialogContext';
import { LlmProvider } from '../types/ApiTypes';
import { collectionElementIcons } from '../utils/CollectionUtils';
import EnhancedTask from '../components/enhanced/task/task/EnhancedTask';
import EnhancedTaskResponse from '../components/enhanced/task_response/task_response/EnhancedTaskResponse';
import EnhancedFile from '../components/enhanced/file/file/EnhancedFile';
import EnhancedMessage from '../components/enhanced/message/message/EnhancedMessage';
import EnhancedEntityReference from '../components/enhanced/entity_reference/entity_reference/EnhancedEntityReference';
import EnhancedToolCall from '../components/enhanced/tool_calls/tool_calls/EnhancedToolCall';
import EnhancedCodeExecution from '../components/enhanced/code_execution/code_execution/EnhancedCodeExecution';
import ChatShortListView from '../components/enhanced/chat/chat/ChatShortListView';
import ChatThreadFullView from '../components/enhanced/chat_thread/chat_thread/ChatThreadFullView';
import VerticalMenuSidebar from '../components/ui/vertical_menu/VerticalMenuSidebar';
import ChatInput, { ChatInputRef } from '../components/ui/chat_interface/ChatInput';
import useStyles from '../styles/ChatAliceStyles';
import PlaceholderSkeleton from '../components/ui/placeholder_skeleton/PlaceholderSkeleton';
import Logger from '../utils/Logger';
import FilterSelect from '../components/ui/sidetab_header/FilterSelect';
import ActiveChatDetails from '../components/ui/chat_interface/ActiveChatDetails';

const ChatAlice: React.FC = () => {
  const classes = useStyles();
  const {
    pastChats,
    currentChatId,
    handleSelectChat,
    currentThread,
    currentChat,
    addTaskToChat,
    isTaskInChat,
    loading,
  } = useChat();
  const { selectCardItem, selectFlexibleItem } = useDialog();

  const [activeTab, setActiveTab] = useState('Select Chat');
  const [selectedApiProvider, setSelectedApiProvider] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(true);

  const chatInputRef = useRef<ChatInputRef>(null);

  const selectChatId = useCallback(async (chat: AliceChat | PopulatedAliceChat) => {
    Logger.debug('Selected chat:', chat);
    if (!chat._id) return;
    await handleSelectChat(chat._id);
    setActiveTab('Current Chat');
  }, [handleSelectChat]);

  const handleCreateNew = useCallback(() => {
    selectFlexibleItem('Chat', 'create');
  }, [selectFlexibleItem]);

  const handleTabChange = useCallback((tabName: string) => {
    setActiveTab(tabName);
  }, []);

  const handleApiProviderChange = useCallback((event: SelectChangeEvent<string>) => {
    setSelectedApiProvider(event.target.value);
  }, []);

  const filteredPastChats = useMemo(() => {
    // First filter the chats based on API provider
    const filtered = !selectedApiProvider
      ? pastChats
      : pastChats.filter(chat => {
        const chatModel = chat.alice_agent.models?.chat;
        return chatModel && chatModel.api_name === selectedApiProvider;
      });

    // Then sort by updatedAt in descending order
    return filtered.sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [pastChats, selectedApiProvider]);

  const checkAndAddTask = useCallback((task: AliceTask | PopulatedTask) => {
    if (task._id && !isTaskInChat(task._id)) {
      addTaskToChat(task._id);
    }
  }, [isTaskInChat, addTaskToChat]);

  const addMessageReference = useCallback((message: any) => {
    chatInputRef.current?.addMessageReference(message);
  }, []);

  const actions = useMemo(() => {
    return [
      {
        name: `Create chat`,
        icon: Add,
        action: handleCreateNew,
        disabled: activeTab !== 'Select Chat'
      },
    ];
  }, [activeTab, handleCreateNew]);

  const tabs = useMemo(() => {
    return [
      { name: 'Select Chat', icon: collectionElementIcons.Chat, group: 'Chat' },
      { name: 'Current Chat', icon: loading ? HourglassBottom : Info, disabled: !currentChatId, group: 'Info' },
      { name: 'Add Tools', icon: collectionElementIcons.Task, disabled: !currentChatId, group: 'Info' },
      { name: 'Add File Reference', icon: collectionElementIcons.File, disabled: !currentChatId, group: 'Ref' },
      { name: 'Add Message Reference', icon: collectionElementIcons.Message, disabled: !currentChatId, group: 'Ref' },
      { name: 'Add Task Results', icon: collectionElementIcons.TaskResponse, disabled: !currentChatId, group: 'Ref' },
      { name: 'Add Entity Reference', icon: collectionElementIcons.EntityReference, disabled: !currentChatId, group: 'Ref' },
      { name: 'Add Tool Call', icon: collectionElementIcons.ToolCall, disabled: !currentChatId, group: 'Ref' },
      { name: 'Add Code Execution', icon: collectionElementIcons.CodeExecution, disabled: !currentChatId, group: 'Ref' },
    ]
  }, [loading, currentChatId]);

  const renderSidebarContent = useCallback((tabName: string) => {
    const handleProps = {
      handleAgentClick: (id: string) => selectCardItem('Agent', id),
      handleTaskClick: (id: string) => selectCardItem('Task', id),
      handleModelClick: (id: string) => selectCardItem('Model', id),
      handlePromptClick: (id: string) => selectCardItem('Prompt', id),
      handleParameterClick: (id: string) => selectCardItem('Parameter', id),
      handleAPIClick: (id: string) => selectCardItem('API', id),
      handleMessageClick: (id: string) => selectCardItem('Message', id),
      handleEntityReferenceClick: (id: string) => selectCardItem('EntityReference', id),
      handleToolCallClick: (id: string) => selectCardItem('ToolCall', id),
      handleCodeExecutionClick: (id: string) => selectCardItem('CodeExecution', id),
    };

    return (
      <Box className={classes.activeListContainer}>
        {tabName === 'Select Chat' && (
          <FilterSelect
            title="Select Chat"
            currentSelection={selectedApiProvider}
            options={Object.values(LlmProvider)}
            handleSelectionChange={handleApiProviderChange}
          />
        )}
        <Box className={classes.activeListContent}>
          {(() => {
            switch (tabName) {
              case 'Select Chat':
                return (
                  <ChatShortListView
                    items={filteredPastChats}
                    onView={(chat) => selectCardItem('Chat', chat?._id)}
                    onInteraction={selectChatId}
                    item={null} mode={'view'}
                    onChange={() => null}
                    handleSave={async () => { }}
                  />
                );
              case 'Current Chat':
                return <ActiveChatDetails onThreadSelected={() => setIsExpanded(false)} />;
              case 'Add Tools':
                return (
                  <EnhancedTask
                    mode={'list'}
                    fetchAll={true}
                    onInteraction={checkAndAddTask}
                    onView={(task) => task._id && selectCardItem('Task', task._id)}
                    {...handleProps}
                  />
                );
              case 'Add Task Results':
                return (
                  <EnhancedTaskResponse
                    mode={'list'}
                    fetchAll={true}
                    onView={(taskResult) => taskResult._id && selectCardItem('TaskResponse', taskResult._id)}
                    onInteraction={addMessageReference}
                    {...handleProps}
                  />
                );
              case 'Add File Reference':
                return (
                  <EnhancedFile
                    mode={'list'}
                    fetchAll={true}
                    onView={(file) => file._id && selectCardItem('File', file._id)}
                    onInteraction={addMessageReference}
                    {...handleProps}
                  />
                );
              case 'Add Entity Reference':
                return (
                  <EnhancedEntityReference
                    mode={'list'}
                    fetchAll={true}
                    onView={(entityReference) => entityReference._id && selectCardItem('EntityReference', entityReference._id)}
                    onInteraction={addMessageReference}
                    {...handleProps}
                  />
                );
              case 'Add Message Reference':
                return (
                  <EnhancedMessage
                    mode={'list'}
                    fetchAll={true}
                    onView={(message) => message._id && selectCardItem('Message', message._id)}
                    onInteraction={addMessageReference}
                    {...handleProps}
                  />
                );
              case 'Add Tool Call':
                return (
                  <EnhancedToolCall
                    mode={'list'}
                    fetchAll={true}
                    onView={(toolCall) => toolCall._id && selectCardItem('ToolCall', toolCall._id)}
                    onInteraction={addMessageReference}
                    {...handleProps}
                  />
                )
              case 'Add Code Execution':
                return (
                  <EnhancedCodeExecution
                    mode={'list'}
                    fetchAll={true}
                    onView={(codeExecution) => codeExecution._id && selectCardItem('CodeExecution', codeExecution._id)}
                    onInteraction={addMessageReference}
                    {...handleProps}
                  />
                )
              default:
                return null;
            }
          })()}
        </Box>
      </Box>
    )
  }, [selectChatId, checkAndAddTask, addMessageReference, selectCardItem, filteredPastChats, classes.activeListContainer, classes.activeListContent, selectedApiProvider, handleApiProviderChange]);

  return (
    <Box className={classes.chatAliceContainer}>
      <VerticalMenuSidebar
        actions={actions}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        renderContent={renderSidebarContent}
        expandedWidth={TASK_SIDEBAR_WIDTH}
        collapsedWidth={SIDEBAR_COLLAPSED_WIDTH}
        expanded={isExpanded}
        onExpandedChange={setIsExpanded}
      />
      <Box className={classes.chatAliceMain}>
        <Box className={classes.chatAliceMessages}>
          {currentChatId && currentChat ? !currentThread ? (
            <PlaceholderSkeleton
              mode="chat"
              text='Select a thread (or start a new one) to start chatting with Alice.'
            />
          ) : (
            <ChatThreadFullView />
          ) : (
            <PlaceholderSkeleton
              mode="chat"
              text='Select a chat to start.'
            />
          )}
        </Box>
        {currentChatId && (
          <Box className={classes.chatAliceInput}>
            <ChatInput
              ref={chatInputRef}
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default React.memo(ChatAlice);