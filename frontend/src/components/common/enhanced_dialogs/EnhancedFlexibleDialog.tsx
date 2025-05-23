import React from 'react';
import { Dialog } from '@mui/material';
import EnhancedTask from '../../enhanced/task/task/EnhancedTask';
import EnhancedTaskResponse from '../../enhanced/task_response/task_response/EnhancedTaskResponse';
import EnhancedChat from '../../enhanced/chat/chat/EnhancedChat';
import EnhancedPrompt from '../../enhanced/prompt/prompt/EnhancedPrompt';
import EnhancedModel from '../../enhanced/model/model/EnhancedModel';
import EnhancedParameter from '../../enhanced/parameter/parameter/EnhancedParameter';
import EnhancedAPI from '../../enhanced/api/api/EnhancedApi';
import EnhancedAgent from '../../enhanced/agent/agent/EnhancedAgent';
import EnhancedFile from '../../enhanced/file/file/EnhancedFile';
import EnhancedMessage from '../../enhanced/message/message/EnhancedMessage';
import EnhancedEntityReference from '../../enhanced/entity_reference/entity_reference/EnhancedEntityReference';
import { useDialog } from '../../../contexts/DialogContext';
import { CollectionPopulatedType, ComponentMode } from '../../../types/CollectionTypes';
import Logger from '../../../utils/Logger';
import EnhancedUserCheckpoint from '../../enhanced/user_checkpoint/user_checkpoint/EnhancedUserCheckpoint';
import EnhancedUserInteraction from '../../enhanced/user_interaction/user_interaction/EnhancedUserInteraction';
import EnhancedEmbeddingChunk from '../../enhanced/embedding_chunk/embedding_chunk/EnhancedEmbeddingChunk';
import EnhancedDataCluster from '../../enhanced/data_cluster/data_cluster/EnhancedDataCluster';
import EnhancedToolCall from '../../enhanced/tool_calls/tool_calls/EnhancedToolCall';
import EnhancedCodeExecution from '../../enhanced/code_execution/code_execution/EnhancedCodeExecution';
import EnhancedAPIConfig from '../../enhanced/api_config/api_config/EnhancedAPIConfig';
import EnhancedChatThread from '../../enhanced/chat_thread/chat_thread/EnhancedChat';
import { AliceAgent } from '../../../types/AgentTypes';
import { PopulatedChatThread } from '../../../types/ChatThreadTypes';
import { PopulatedTask } from '../../../types/TaskTypes';
import { AliceModel } from '../../../types/ModelTypes';
import { Prompt } from '../../../types/PromptTypes';
import { ParameterDefinition } from '../../../types/ParameterTypes';
import { API } from '../../../types/ApiTypes';
import { PopulatedFileReference } from '../../../types/FileTypes';
import { PopulatedMessage } from '../../../types/MessageTypes';
import { PopulatedEntityReference } from '../../../types/EntityReferenceTypes';
import { UserCheckpoint } from '../../../types/UserCheckpointTypes';
import { PopulatedUserInteraction } from '../../../types/UserInteractionTypes';
import { EmbeddingChunk } from '../../../types/EmbeddingChunkTypes';
import { PopulatedDataCluster } from '../../../types/DataClusterTypes';
import { PopulatedToolCall } from '../../../types/ToolCallTypes';
import { PopulatedCodeExecution } from '../../../types/CodeExecutionTypes';
import { APIConfig } from '../../../types/ApiConfigTypes';

// TODO: OnFlexibleDialogSave IS STILL BUGGY

const EnhancedFlexibleDialog: React.FC = () => {
  const {
    selectedFlexibleItem,
    selectedFlexibleItemType,
    selectCardItem,
    flexibleDialogMode,
    closeFlexibleDialog,
    isFlexibleDialogOpen,
    flexibleDialogZIndex,
    onFlexibleDialogSave
  } = useDialog();

  const renderDialogContent = () => {
    if (!selectedFlexibleItemType || !flexibleDialogMode || !isFlexibleDialogOpen) return null;
    Logger.debug('renderDialogContent', selectedFlexibleItemType, flexibleDialogMode, selectedFlexibleItem);

    const handleProps = {
      handleAgentClick: (id: string, item?: AliceAgent) => selectCardItem('Agent', id, item),
      handleTaskClick: (id: string, item?: PopulatedTask) => selectCardItem('Task', id, item),
      handleModelClick: (id: string, item?: AliceModel) => selectCardItem('Model', id, item),
      handlePromptClick: (id: string, item?: Prompt) => selectCardItem('Prompt', id, item),
      handleParameterClick: (id: string, item?: ParameterDefinition) => selectCardItem('Parameter', id, item),
      handleAPIClick: (id: string, item?: API) => selectCardItem('API', id, item),
      handleFileClick: (id: string, item?: PopulatedFileReference) => selectCardItem('File', id, item),
      handleMessageClick: (id: string, item?: PopulatedMessage) => selectCardItem('Message', id, item),
      handleEntityReferenceClick: (id: string, item?: PopulatedEntityReference) => selectCardItem('EntityReference', id, item),
      handleUserCheckpointClick: (id: string, item?: UserCheckpoint) => selectCardItem('UserCheckpoint', id, item),
      handleUserInteractionClick: (id: string, item?: PopulatedUserInteraction) => selectCardItem('UserInteraction', id, item),
      handleEmbeddingChunkClick: (id: string, item?: EmbeddingChunk) => selectCardItem('EmbeddingChunk', id, item),
      handleDataClusterClick: (id: string, item?: PopulatedDataCluster) => selectCardItem('DataCluster', id, item),
      handleToolCallClick: (id: string, item?: PopulatedToolCall) => selectCardItem('ToolCall', id, item),
      handleCodeExecutionClick: (id: string, item?: PopulatedCodeExecution) => selectCardItem('CodeExecution', id, item),
      handleAPIConfigClick: (id: string, item?: APIConfig) => selectCardItem('APIConfig', id, item),
      handleChatThreadClick: (id: string, item?: PopulatedChatThread) => selectCardItem('ChatThread', id, item),
    };

    const commonProps = {
      mode: flexibleDialogMode as ComponentMode,
      fetchAll: false,
      onSave: async (savedItem: any) => {
        Logger.debug('EnhancedFlexibleDialog: onSave called with:', { 
          savedItem,
          onFlexibleDialogSave,
          typeofCallback: typeof onFlexibleDialogSave 
        });
        try {
          if (savedItem && onFlexibleDialogSave) {
            Logger.debug('Executing onFlexibleDialogSave with:', savedItem);
            await onFlexibleDialogSave(savedItem);
          }
          closeFlexibleDialog();
          return savedItem;
        } catch (error) {
          Logger.error('Error in flexible dialog onSave:', error);
          throw error;
        }
      },
      onDelete: async () => closeFlexibleDialog(),
      ...handleProps,
    };

    if (flexibleDialogMode === 'edit' as ComponentMode && selectedFlexibleItem && '_id' in selectedFlexibleItem) {
      switch (selectedFlexibleItemType) {
        case 'Agent':
          return <EnhancedAgent itemId={selectedFlexibleItem._id} {...commonProps} />;
        case 'Task':
          return <EnhancedTask itemId={selectedFlexibleItem._id} {...commonProps} />;
        case 'TaskResponse':
          return <EnhancedTaskResponse itemId={selectedFlexibleItem._id} {...commonProps} />;
        case 'Chat':
          return <EnhancedChat itemId={selectedFlexibleItem._id} {...commonProps} />;
        case 'ChatThread':
          return <EnhancedChatThread itemId={selectedFlexibleItem._id} {...commonProps} />;
        case 'Prompt':
          return <EnhancedPrompt itemId={selectedFlexibleItem._id} {...commonProps} />;
        case 'Model':
          return <EnhancedModel itemId={selectedFlexibleItem._id} {...commonProps} />;
        case 'Parameter':
          return <EnhancedParameter itemId={selectedFlexibleItem._id} {...commonProps} />;
        case 'API':
          return <EnhancedAPI itemId={selectedFlexibleItem._id} {...commonProps} />;
        case 'File':
          return <EnhancedFile itemId={selectedFlexibleItem._id} {...commonProps} />;
        case 'Message':
          return <EnhancedMessage itemId={selectedFlexibleItem._id} {...commonProps} />;
        case 'EntityReference':
          return <EnhancedEntityReference itemId={selectedFlexibleItem._id} {...commonProps} />;
        case 'UserCheckpoint':
          return <EnhancedUserCheckpoint itemId={selectedFlexibleItem._id} {...commonProps} />;
        case 'UserInteraction':
          return <EnhancedUserInteraction itemId={selectedFlexibleItem._id} {...commonProps} />;
        case 'EmbeddingChunk':
          return <EnhancedEmbeddingChunk itemId={selectedFlexibleItem._id} {...commonProps} />;
        case 'DataCluster':
          return <EnhancedDataCluster itemId={selectedFlexibleItem._id} {...commonProps} />;
        case 'ToolCall':
          return <EnhancedToolCall itemId={selectedFlexibleItem._id} {...commonProps} />;
        case 'CodeExecution':
          return <EnhancedCodeExecution itemId={selectedFlexibleItem._id} {...commonProps} />;
        case 'APIConfig':
          return <EnhancedAPIConfig itemId={selectedFlexibleItem._id} {...commonProps} />;
        default:
          return null;
      }
    } else if (flexibleDialogMode === 'create') {
      switch (selectedFlexibleItemType) {
        case 'Agent':
          return <EnhancedAgent {...commonProps} item={selectedFlexibleItem as CollectionPopulatedType['agents']} />;
        case 'Task':
          return <EnhancedTask {...commonProps} item={selectedFlexibleItem as CollectionPopulatedType['tasks']} />;
        case 'TaskResponse':
          return <EnhancedTaskResponse {...commonProps} />;
        case 'Chat':
          return <EnhancedChat {...commonProps} item={selectedFlexibleItem as CollectionPopulatedType['chats']} />;
        case 'ChatThread':
          return <EnhancedChatThread {...commonProps} item={selectedFlexibleItem as PopulatedChatThread} />;
        case 'Prompt':
          return <EnhancedPrompt {...commonProps} item={selectedFlexibleItem as CollectionPopulatedType['prompts']} />;
        case 'Model':
          return <EnhancedModel {...commonProps} item={selectedFlexibleItem as CollectionPopulatedType['models']} />;
        case 'Parameter':
          return <EnhancedParameter {...commonProps} item={selectedFlexibleItem as CollectionPopulatedType['parameters']} />;
        case 'API':
          return <EnhancedAPI {...commonProps} item={selectedFlexibleItem as CollectionPopulatedType['apis']} />;
        case 'File':
          return <EnhancedFile {...commonProps} item={selectedFlexibleItem as CollectionPopulatedType['files']} />;
        case 'Message':
          return <EnhancedMessage {...commonProps} item={selectedFlexibleItem as CollectionPopulatedType['messages']} />;
        case 'EntityReference':
          return <EnhancedEntityReference {...commonProps} item={selectedFlexibleItem as CollectionPopulatedType['entityreferences']} />;
        case 'UserCheckpoint':
          return <EnhancedUserCheckpoint {...commonProps} item={selectedFlexibleItem as CollectionPopulatedType['usercheckpoints']} />;
        case 'UserInteraction':
          return <EnhancedUserInteraction {...commonProps} item={selectedFlexibleItem as CollectionPopulatedType['userinteractions']} />;
        case 'EmbeddingChunk':
          return <EnhancedEmbeddingChunk {...commonProps} item={selectedFlexibleItem as CollectionPopulatedType['embeddingchunks']} />;
        case 'DataCluster':
          return <EnhancedDataCluster {...commonProps} item={selectedFlexibleItem as CollectionPopulatedType['dataclusters']} />;
        case 'APIConfig':
          return <EnhancedAPIConfig {...commonProps} item={selectedFlexibleItem as CollectionPopulatedType['apiconfigs']} />;
        default:
          return null;
      }
    }
    return null;
  };

  return (
    <Dialog open={isFlexibleDialogOpen} onClose={closeFlexibleDialog} maxWidth='xl' style={{ zIndex: flexibleDialogZIndex }}>
      {renderDialogContent()}
    </Dialog>
  );
};

export default EnhancedFlexibleDialog;