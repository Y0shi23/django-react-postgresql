'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSidebar } from '@/context/SidebarContext';
import { useAuth } from '@/context/AuthContext';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

// APIのベースURLを定義
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// SVGアイコンコンポーネント
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const HashtagIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5-3.9 19.5m-2.1-19.5-3.9 19.5" />
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
  </svg>
);

const UserPlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
  </svg>
);

// Add new icon components for expand/collapse
const ChevronDownIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

// 編集アイコン
const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21h-9.5A2.25 2.25 0 014 18.75V8.25A2.25 2.25 0 016.25 6H11" />
  </svg>
);

// 削除アイコン
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

interface Server {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  createdAt: string;
  memberCount: number;
}

interface Category {
  id: string;
  serverId: string;
  name: string;
  position: number;
  createdAt: string;
}

interface Channel {
  id: string;
  serverId: string;
  categoryId: string;
  name: string;
  description: string;
  isPrivate: boolean;
  createdAt: string;
}

// Draggable Channel component
const DraggableChannel = ({ 
  channel, 
  isActive, 
  isCurrentChannel, 
  onAddMember,
  onEditChannel,
  onDeleteChannel
}: { 
  channel: Channel; 
  isActive: boolean; 
  isCurrentChannel: boolean | null;
  onAddMember: (channelId: string) => void;
  onEditChannel: (channel: Channel) => void;
  onDeleteChannel: (channelId: string) => void;
}) => {
  const router = useRouter();
  const [isDragActive, setIsDragActive] = useState(false);
  const [showActions, setShowActions] = useState(false);
  
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: channel.id,
    data: {
      type: 'channel',
      channel,
    }
  });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0 : 1,
  } : undefined;

  // Handle channel click without triggering drag
  const handleChannelClick = (e: React.MouseEvent) => {
    // Prevent the drag listeners from capturing this event
    e.stopPropagation();
    
    // Only navigate if not currently dragging
    if (!isDragging) {
      router.push(`/channels/${channel.id}`);
    }
  };

  // Handle mouse down to change cursor style
  const handleMouseDown = () => {
    // Set a timeout to change cursor after a delay (for long press)
    const timer = setTimeout(() => {
      setIsDragActive(true);
    }, 200);
    
    // Clear the timeout on mouse up
    const handleMouseUp = () => {
      clearTimeout(timer);
      setIsDragActive(false);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center px-3 py-0.5 rounded group ${
        isDragActive ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      } ${
        isCurrentChannel === true ? 'bg-gray-700' : 'hover:bg-gray-700'
      } ${isActive ? 'opacity-50' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      {...attributes}
      {...listeners}
    >
      <div
        className="flex items-center flex-grow"
        onClick={handleChannelClick}
      >
        {channel.isPrivate ? (
          <LockIcon />
        ) : (
          <HashtagIcon />
        )}
        <span className="ml-2 truncate">{channel.name}</span>
      </div>
      
      {showActions && (
        <div className="flex items-center ml-auto space-x-1">
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEditChannel(channel);
            }}
            className="p-1 rounded-full hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
            title="チャンネルを編集"
          >
            <PencilIcon />
          </button>
          
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDeleteChannel(channel.id);
            }}
            className="p-1 rounded-full hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
            title="チャンネルを削除"
          >
            <TrashIcon />
          </button>
          
          {channel.isPrivate && (
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddMember(channel.id);
              }}
              className="p-1 rounded-full hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
              title="メンバーを追加"
            >
              <UserPlusIcon />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// Droppable Category component
const DroppableCategory = ({ 
  category, 
  channels, 
  isOwner,
  currentChannelId,
  activeChannelId,
  onAddChannel,
  onAddMember,
  onEditChannel,
  onDeleteChannel
}: { 
  category: Category; 
  channels: Channel[];
  isOwner: boolean;
  currentChannelId: string | null;
  activeChannelId: string | null;
  onAddChannel: () => void;
  onAddMember: (channelId: string) => void;
  onEditChannel: (channel: Channel) => void;
  onDeleteChannel: (channelId: string) => void;
}) => {
  const { setNodeRef } = useDroppable({
    id: category.id,
  });
  
  // State to track if category is expanded or collapsed
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Toggle expanded/collapsed state
  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div 
      ref={setNodeRef}
      className="mb-2 border border-transparent hover:border-gray-700 rounded p-1"
    >
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center cursor-pointer" onClick={toggleExpanded}>
          <button className="mr-1 text-gray-400 hover:text-white">
            {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </button>
          <h3 className="font-medium text-gray-400 uppercase text-xs">{category.name}</h3>
        </div>
        {isOwner && (
          <button 
            onClick={onAddChannel}
            className="p-1 rounded-full hover:bg-gray-700"
            title={`${category.name}にチャンネルを追加`}
          >
            <PlusIcon />
          </button>
        )}
      </div>
      {isExpanded && (
        <div className="space-y-0.5">
          {channels.map((channel) => (
            <DraggableChannel
              key={channel.id}
              channel={channel}
              isActive={activeChannelId === channel.id}
              isCurrentChannel={currentChannelId === channel.id}
              onAddMember={onAddMember}
              onEditChannel={onEditChannel}
              onDeleteChannel={onDeleteChannel}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Droppable Uncategorized section
const DroppableUncategorized = ({ 
  channels, 
  currentChannelId,
  activeChannelId,
  onAddMember,
  onEditChannel,
  onDeleteChannel
}: { 
  channels: Channel[];
  currentChannelId: string | null;
  activeChannelId: string | null;
  onAddMember: (channelId: string) => void;
  onEditChannel: (channel: Channel) => void;
  onDeleteChannel: (channelId: string) => void;
}) => {
  const { setNodeRef } = useDroppable({
    id: 'uncategorized',
  });
  
  // State to track if uncategorized section is expanded or collapsed
  const [isExpanded, setIsExpanded] = useState(true);
  
  // Toggle expanded/collapsed state
  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <div 
      ref={setNodeRef}
      className="mt-2 border border-transparent hover:border-gray-700 rounded p-1"
    >
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center cursor-pointer" onClick={toggleExpanded}>
          <button className="mr-1 text-gray-400 hover:text-white">
            {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </button>
          <h3 className="font-medium text-gray-400 uppercase text-xs">未分類</h3>
        </div>
      </div>
      {isExpanded && (
        <div className="space-y-0.5">
          {channels.map((channel) => (
            <DraggableChannel
              key={channel.id}
              channel={channel}
              isActive={activeChannelId === channel.id}
              isCurrentChannel={currentChannelId === channel.id}
              onAddMember={onAddMember}
              onEditChannel={onEditChannel}
              onDeleteChannel={onDeleteChannel}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default function ServerSidebar() {
  const [servers, setServers] = useState<Server[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewServerModal, setShowNewServerModal] = useState(false);
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedCategoryForChannel, setSelectedCategoryForChannel] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [currentServerData, setCurrentServerData] = useState<Server | null>(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { isSidebarOpen, closeSidebar, toggleSidebar } = useSidebar();
  const { user } = useAuth();
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // State for channel editing
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);
  const [showEditChannelModal, setShowEditChannelModal] = useState(false);

  // Extract current channel ID from path if available
  const pathParts = pathname ? pathname.split('/') : [];
  const currentChannelId = pathParts[pathParts.length - 1];

  // Configure DnD sensors with stricter activation constraints
  const mouseSensor = useSensor(MouseSensor, {
    // Require the mouse to move by 10 pixels before activating
    activationConstraint: {
      distance: 10, // Increased from 3 to 10
      delay: 250,   // Add a delay of 250ms before drag can start
      tolerance: 5, // Allow some movement during the delay
    },
  });
  
  const touchSensor = useSensor(TouchSensor, {
    // Require the touch to move by 10 pixels before activating
    activationConstraint: {
      distance: 10,
      delay: 250,
      tolerance: 5,
    },
  });
  
  const sensors = useSensors(mouseSensor, touchSensor);

  // クライアントサイドでのレンダリングを検出するための状態
  const [isClient, setIsClient] = useState(false);

  // クライアントサイドでのレンダリングを検出
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // トークンの存在を確認
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('認証トークンがありません。ログインページにリダイレクトします。');
      router.push('/login');
      return;
    }
    
    fetchServers();
  }, []);

  useEffect(() => {
    if (selectedServer) {
      fetchChannels(selectedServer);
      fetchCategories(selectedServer);
      // Find the current server data
      const serverData = servers.find(server => server.id === selectedServer) || null;
      setCurrentServerData(serverData);
    }
  }, [selectedServer, servers]);

  const fetchServers = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      // トークンが存在しない場合の処理を追加
      if (!token) {
        console.error('認証トークンがありません。ログインしてください。');
        setIsLoading(false);
        setServers([]); // 空の配列を設定
        // エラー状態を設定するか、ログインページにリダイレクトするなどの処理を追加
        return;
      }
      
      const response = await fetch('http://localhost:3000/api/servers', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // レスポンスの詳細情報を取得
        const errorText = await response.text();
        console.error('サーバーからのエラーレスポンス:', response.status, errorText);
        throw new Error('サーバーの取得に失敗しました');
      }

      const data = await response.json();
      setServers(data.servers || []); // データがない場合は空の配列を設定
      
      // Select the first server by default if none is selected
      if (data.servers && data.servers.length > 0 && !selectedServer) {
        setSelectedServer(data.servers[0].id);
      }
    } catch (error) {
      console.error('Error fetching servers:', error);
      setServers([]); // エラー時は空の配列を設定
    } finally {
      setIsLoading(false);
    }
  };

  const fetchChannels = async (serverId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('認証トークンがありません。ログインしてください。');
        return;
      }
      
      const response = await fetch(`http://localhost:3000/api/servers/${serverId}/channels`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // レスポンスの詳細情報を取得
        const errorText = await response.text();
        console.error('サーバーからのエラーレスポンス:', response.status, errorText);
        throw new Error('チャンネルの取得に失敗しました');
      }

      const data = await response.json();
      setChannels(data.channels);
      
      // チャンネルが取得できた場合の処理
      if (data.channels && data.channels.length > 0) {
        // 現在のパスがチャンネルを指していない場合は、最初のチャンネルに移動
        const currentPath = pathname || '';
        const isInChannel = currentPath.includes('/channels/') && 
                           data.channels.some((channel: Channel) => currentPath.includes(channel.id));
        
        if (!isInChannel && pathname === '/channels') {
          router.push(`/channels/${data.channels[0].id}`);
        }
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  };

  const fetchCategories = async (serverId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('認証トークンがありません');
        return;
      }

      const response = await fetch(`http://localhost:3000/api/servers/${serverId}/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('カテゴリーの取得に失敗しました');
      }

      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  };

  const createServer = async (name: string, description: string) => {
    try {
      const token = localStorage.getItem('token');
      
      // トークンが存在しない場合の処理を追加
      if (!token) {
        console.error('認証トークンがありません。ログインしてください。');
        // エラー状態を設定するか、ログインページにリダイレクトするなどの処理を追加
        return;
      }
      
      console.log('リクエスト送信前のトークン:', token); // デバッグ用
      
      const requestOptions = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description }),
      };
      
      console.log('リクエスト詳細:', {
        url: 'http://localhost:3000/api/servers',
        method: requestOptions.method,
        headers: requestOptions.headers,
        body: requestOptions.body
      });
      
      const response = await fetch('http://localhost:3000/api/servers', requestOptions);

      console.log('レスポンスステータス:', response.status);
      console.log('レスポンスヘッダー:', Object.fromEntries([...response.headers.entries()]));

      if (!response.ok) {
        // レスポンスの詳細情報を取得
        const errorText = await response.text();
        console.error('サーバーからのエラーレスポンス:', response.status, errorText);
        throw new Error('サーバーの作成に失敗しました');
      }

      const data = await response.json();
      setShowNewServerModal(false);
      fetchServers();
      setSelectedServer(data.server.id);
    } catch (error) {
      console.error('Error creating server:', error);
    }
  };

  const createChannel = async (name: string, description: string, isPrivate: boolean, categoryId: string = '') => {
    if (!selectedServer) return;
    
    try {
      const token = localStorage.getItem('token');
      console.log('Creating channel with:', { name, description, isPrivate, categoryId });
      
      const response = await fetch(`http://localhost:3000/api/servers/${selectedServer}/channels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          name, 
          description, 
          isPrivate, 
          categoryId: categoryId && categoryId !== 'uncategorized' ? categoryId : '' 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error('チャンネルの作成に失敗しました');
      }

      setShowNewChannelModal(false);
      fetchChannels(selectedServer);
    } catch (error) {
      console.error('Error creating channel:', error);
    }
  };

  const createCategory = async (name: string) => {
    if (!selectedServer) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/servers/${selectedServer}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error('カテゴリーの作成に失敗しました');
      }

      setShowNewCategoryModal(false);
      fetchCategories(selectedServer);
    } catch (error) {
      console.error('Error creating category:', error);
    }
  };

  const updateChannelCategory = async (channelId: string, categoryId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/channels/${channelId}/category`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ categoryId }),
      });

      if (!response.ok) {
        throw new Error('チャンネルのカテゴリ更新に失敗しました');
      }
    } catch (error) {
      console.error('Error updating channel category:', error);
    }
  };

  // チャンネルを編集する関数
  const editChannel = async (channelId: string, name: string, description: string, isPrivate: boolean) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/channels/${channelId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          name, 
          description, 
          isPrivate 
        }),
      });

      if (!response.ok) {
        throw new Error('チャンネルの編集に失敗しました');
      }

      // 成功したら、チャンネル一覧を再取得
      if (currentServerData) {
        fetchChannels(currentServerData.id);
      }
    } catch (error) {
      console.error('Error editing channel:', error);
    }
  };

  // チャンネルを削除する関数
  const deleteChannel = async (channelId: string) => {
    if (!confirm('このチャンネルを削除しますか？')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/channels/${channelId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('チャンネルの削除に失敗しました');
      }

      // 成功したら、チャンネル一覧を再取得
      if (currentServerData) {
        fetchChannels(currentServerData.id);
      }
    } catch (error) {
      console.error('Error deleting channel:', error);
    }
  };

  const addChannelMember = async (channelId: string, email: string) => {
    try {
      // First, get user ID from email
      const token = localStorage.getItem('token');
      const userResponse = await fetch(`${API_URL}/api/users/by-email?email=${email}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error('ユーザーの取得に失敗しました');
      }

      const userData = await userResponse.json();
      
      // Then add user to channel
      const response = await fetch(`${API_URL}/api/channels/${channelId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: userData.user.id }),
      });

      if (!response.ok) {
        throw new Error('メンバーの追加に失敗しました');
      }

      setShowAddMemberModal(false);
    } catch (error) {
      console.error('Error adding channel member:', error);
    }
  };

  // モバイル表示時にリンククリック後にサイドバーを閉じる
  const handleLinkClick = () => {
    if (window.innerWidth <= 768) {
      closeSidebar();
    }
  };

  // サーバー選択時の処理
  const handleServerSelect = (serverId: string) => {
    setSelectedServer(serverId);
    
    // サーバーが選択されたら、そのサーバーの最初のチャンネルに移動
    if (channels.length > 0) {
      router.push(`/channels/${channels[0].id}`);
    }
  };

  // Check if current user is the server owner
  const isServerOwner = user && currentServerData && user.id === currentServerData.ownerId ? true : false;

  // Handle right click on sidebar
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Only show context menu if a server is selected
    if (selectedServer) {
      // Adjust position to ensure menu stays within viewport
      const x = Math.min(e.clientX, window.innerWidth - 192); // 192px is menu width (48*4)
      const y = Math.min(e.clientY, window.innerHeight - 120); // Approximate menu height
      
      setContextMenuPosition({ x, y });
      setShowContextMenu(true);
    }
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setShowContextMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle invite friend
  const handleInviteFriend = () => {
    // Implement invite functionality here
    alert('友達を招待する機能は開発中です');
    setShowContextMenu(false);
  };

  // Handle create category
  const handleCreateCategory = () => {
    setShowNewCategoryModal(true);
    setShowContextMenu(false);
  };

  // Group channels by category
  const channelsByCategory = channels.reduce((acc, channel) => {
    // Use 'uncategorized' for channels without a category
    const categoryId = channel.categoryId || 'uncategorized';
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(channel);
    return acc;
  }, {} as Record<string, Channel[]>);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const channelId = active.id as string;
    const draggedChannel = channels.find(channel => channel.id === channelId) || null;
    
    // Store the initial cursor position for better positioning
    setActiveChannel(draggedChannel);
    setIsDragging(true);
  };
  
  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setIsDragging(false);
    setActiveChannel(null);
    
    if (!over) return;
    
    const channelId = active.id as string;
    const categoryId = over.id as string;
    
    // Don't do anything if dropped in the same category
    const channel = channels.find(c => c.id === channelId);
    if (!channel || channel.categoryId === categoryId) return;
    
    try {
      // Optimistically update the UI first
      const updatedChannels = channels.map(c => 
        c.id === channelId 
          ? { ...c, categoryId: categoryId } 
          : c
      );
      setChannels(updatedChannels);
      
      // Then update the server
      await updateChannelCategory(channelId, categoryId);
      
      // No need to fetch all channels again, we've already updated the state
      console.log(`チャンネル "${channel.name}" を新しいカテゴリーに移動しました`);
    } catch (error) {
      console.error('Error updating channel category:', error);
      // Revert the optimistic update if the server request fails
      fetchChannels(selectedServer!);
    }
  };

  // Improved collision detection function that finds the closest droppable container
  const simpleCollisionDetection = ({ 
    droppableContainers, 
    active,
    pointerCoordinates
  }: { 
    droppableContainers: Array<{ 
      id: string | number;
      rect: { 
        current: { 
          top: number;
          left: number;
          bottom: number;
          right: number;
          width: number;
          height: number;
        } | null 
      };
    }>;
    active: { id: string | number };
    pointerCoordinates: { x: number; y: number } | null;
  }) => {
    // If there are no droppable containers or no pointer coordinates, return null
    if (!droppableContainers.length || !pointerCoordinates) return null;
    
    // Find containers that the pointer is within
    const containersUnderPointer = droppableContainers.filter(container => {
      const rect = container.rect.current;
      if (!rect) return false;
      
      return (
        pointerCoordinates.x >= rect.left &&
        pointerCoordinates.x <= rect.right &&
        pointerCoordinates.y >= rect.top &&
        pointerCoordinates.y <= rect.bottom
      );
    });
    
    // If the pointer is within any containers, return the first one
    if (containersUnderPointer.length > 0) {
      return containersUnderPointer[0].id;
    }
    
    // If the pointer is not within any container, find the closest one
    let closestContainer = null;
    let minDistance = Infinity;
    
    droppableContainers.forEach(container => {
      const rect = container.rect.current;
      if (!rect) return;
      
      // Calculate the center of the container
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Calculate the distance from the pointer to the center of the container
      const distance = Math.sqrt(
        Math.pow(pointerCoordinates.x - centerX, 2) + 
        Math.pow(pointerCoordinates.y - centerY, 2)
      );
      
      // Update the closest container if this one is closer
      if (distance < minDistance) {
        minDistance = distance;
        closestContainer = container.id;
      }
    });
    
    return closestContainer;
  };

  // Handle edit channel button click
  const handleEditChannel = (channel: Channel) => {
    setEditingChannel(channel);
    setShowEditChannelModal(true);
  };

  // Handle delete channel button click
  const handleDeleteChannel = (channelId: string) => {
    deleteChannel(channelId);
  };

  return (
    <>
      {/* サイドバートグルボタン */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 rounded-md bg-gray-800 text-white md:hidden"
        aria-label="Toggle sidebar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* サイドバー本体 - クライアントサイドでのみスタイルを適用 */}
      {isClient ? (
        <div 
          className="bg-gray-800 text-white h-[calc(100vh-4rem)] fixed left-0 top-16 overflow-y-auto transition-all duration-300 z-40 w-64 md:w-64"
          style={{
            transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          }}
          onContextMenu={handleContextMenu}
        >
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">サーバー</h2>
              <button 
                id="new-server-button"
                onClick={() => setShowNewServerModal(true)}
                className="p-1 rounded-full hover:bg-gray-700"
                title="新しいサーバーを作成"
              >
                <PlusIcon />
              </button>
            </div>

            {isLoading ? (
              <div className="text-center p-4">読み込み中...</div>
            ) : (
              <div className="space-y-1">
                {!servers || servers.length === 0 ? (
                  <div className="text-center p-4 text-gray-400">
                    参加しているサーバが見つかりません
                  </div>
                ) : (
                  servers.map((server) => (
                    <button
                      key={server.id}
                      onClick={() => handleServerSelect(server.id)}
                      className={`w-full text-left px-3 py-2 rounded ${
                        server.id === selectedServer ? 'bg-gray-700' : 'hover:bg-gray-700'
                      }`}
                    >
                      <div className="font-medium">{server.name}</div>
                      <div className="text-xs text-gray-400">{server.memberCount} メンバー</div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {selectedServer && (
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
              autoScroll={{
                enabled: true,
                speed: 5,
                threshold: {
                  x: 0,
                  y: 0.1,
                },
              }}
              measuring={{
                droppable: {
                  strategy: 'always',
                },
              }}
              collisionDetection={simpleCollisionDetection}
            >
              <div className="mt-2 border-t border-gray-700 pt-2 px-4">
                {/* Categories and Channels */}
                {categories.length > 0 ? (
                  categories.map(category => (
                    <DroppableCategory
                      key={category.id}
                      category={category}
                      channels={channelsByCategory[category.id] || []}
                      isOwner={isServerOwner}
                      currentChannelId={currentChannelId}
                      activeChannelId={activeChannel?.id || null}
                      onAddChannel={() => {
                        setSelectedCategoryForChannel(category.id);
                        setShowNewChannelModal(true);
                      }}
                      onAddMember={(channelId) => {
                        setSelectedChannelId(channelId);
                        setShowAddMemberModal(true);
                      }}
                      onEditChannel={handleEditChannel}
                      onDeleteChannel={handleDeleteChannel}
                    />
                  ))
                ) : (
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium">チャンネル</h3>
                    {isServerOwner && (
                      <button 
                        onClick={() => setShowNewChannelModal(true)}
                        className="p-1 rounded-full hover:bg-gray-700"
                        title="新しいチャンネルを作成"
                      >
                        <PlusIcon />
                      </button>
                    )}
                  </div>
                )}

                {/* Uncategorized channels */}
                {channelsByCategory['uncategorized']?.length > 0 && (
                  <DroppableUncategorized
                    channels={channelsByCategory['uncategorized']}
                    currentChannelId={currentChannelId}
                    activeChannelId={activeChannel?.id || null}
                    onAddMember={(channelId) => {
                      setSelectedChannelId(channelId);
                      setShowAddMemberModal(true);
                    }}
                    onEditChannel={handleEditChannel}
                    onDeleteChannel={handleDeleteChannel}
                  />
                )}
              </div>
              
              {/* Drag overlay */}
              <DragOverlay 
                dropAnimation={{
                  duration: 200,
                  easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
                }}
                modifiers={[
                  ({ transform }) => ({
                    ...transform,
                    x: transform.x,
                    y: transform.y - 15,
                  })
                ]}
              >
                {activeChannel && (
                  <div className="flex items-center px-3 py-1 rounded bg-gray-700 opacity-90 w-56 shadow-lg border border-gray-600">
                    {activeChannel.isPrivate ? (
                      <LockIcon />
                    ) : (
                      <HashtagIcon />
                    )}
                    <span className="ml-2 truncate">{activeChannel.name}</span>
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      ) : (
        <div className="hidden"></div>
      )}
      
      {/* モバイル表示時のオーバーレイ */}
      {isClient && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* New Server Modal */}
      {showNewServerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-white">新しいサーバーを作成</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const name = (form.elements.namedItem('name') as HTMLInputElement).value;
              const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value;
              createServer(name, description);
            }}>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">サーバー名</label>
                <input 
                  type="text" 
                  name="name" 
                  className="w-full p-2 bg-gray-700 rounded text-white" 
                  required 
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">説明</label>
                <textarea 
                  name="description" 
                  className="w-full p-2 bg-gray-700 rounded text-white" 
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button 
                  type="button" 
                  className="px-4 py-2 bg-gray-700 text-white rounded"
                  onClick={() => setShowNewServerModal(false)}
                >
                  キャンセル
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  作成
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Channel Modal */}
      {showNewChannelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-white">新しいチャンネルを作成</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const name = (form.elements.namedItem('name') as HTMLInputElement).value;
              const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value;
              const isPrivate = (form.elements.namedItem('isPrivate') as HTMLInputElement).checked;
              const categoryId = (form.elements.namedItem('categoryId') as HTMLSelectElement).value;
              
              // Log values for debugging
              console.log('Creating channel with:', { name, description, isPrivate, categoryId });
              
              // Only pass categoryId if it's not 'uncategorized'
              const finalCategoryId = categoryId !== 'uncategorized' ? categoryId : '';
              createChannel(name, description, isPrivate, finalCategoryId);
            }}>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">チャンネル名</label>
                <input 
                  type="text" 
                  name="name" 
                  className="w-full p-2 bg-gray-700 rounded text-white" 
                  required 
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">説明</label>
                <textarea 
                  name="description" 
                  className="w-full p-2 bg-gray-700 rounded text-white" 
                  rows={3}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">カテゴリー</label>
                <select 
                  name="categoryId" 
                  className="w-full p-2 bg-gray-700 rounded text-white"
                  defaultValue={selectedCategoryForChannel || 'uncategorized'}
                >
                  <option value="uncategorized">未分類</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="flex items-center text-gray-300">
                  <input 
                    type="checkbox" 
                    name="isPrivate" 
                    className="mr-2" 
                  />
                  プライベートチャンネル（招待されたメンバーのみアクセス可能）
                </label>
              </div>
              <div className="flex justify-end space-x-2">
                <button 
                  type="button" 
                  className="px-4 py-2 bg-gray-700 text-white rounded"
                  onClick={() => {
                    setShowNewChannelModal(false);
                    setSelectedCategoryForChannel(null);
                  }}
                >
                  キャンセル
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  作成
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-white">メンバーを追加</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const email = (form.elements.namedItem('email') as HTMLInputElement).value;
              const channelId = currentChannelId;
              addChannelMember(channelId, email);
            }}>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">ユーザーのメールアドレス</label>
                <input 
                  type="email" 
                  name="email" 
                  className="w-full p-2 bg-gray-700 rounded text-white" 
                  required 
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button 
                  type="button" 
                  className="px-4 py-2 bg-gray-700 text-white rounded"
                  onClick={() => setShowAddMemberModal(false)}
                >
                  キャンセル
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  追加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {showContextMenu && (
        <div 
          ref={contextMenuRef}
          className="fixed bg-gray-800 border border-gray-700 rounded shadow-lg z-50 w-48"
          style={{ 
            top: `${contextMenuPosition.y}px`, 
            left: `${contextMenuPosition.x}px` 
          }}
        >
          <ul className="py-1">
            {isServerOwner && (
              <li>
                <button 
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white"
                  onClick={() => {
                    setSelectedCategoryForChannel(null);
                    setShowNewChannelModal(true);
                    setShowContextMenu(false);
                  }}
                >
                  チャンネルを作成
                </button>
              </li>
            )}
            {isServerOwner && (
              <li>
                <button 
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white"
                  onClick={handleCreateCategory}
                >
                  カテゴリーを作成
                </button>
              </li>
            )}
            <li>
              <button 
                className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white"
                onClick={handleInviteFriend}
              >
                友達を招待
              </button>
            </li>
          </ul>
        </div>
      )}

      {/* New Category Modal */}
      {showNewCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-white">新しいカテゴリーを作成</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const name = (form.elements.namedItem('name') as HTMLInputElement).value;
              createCategory(name);
            }}>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">カテゴリー名</label>
                <input 
                  type="text" 
                  name="name" 
                  className="w-full p-2 bg-gray-700 rounded text-white" 
                  required 
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button 
                  type="button" 
                  className="px-4 py-2 bg-gray-700 text-white rounded"
                  onClick={() => setShowNewCategoryModal(false)}
                >
                  キャンセル
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  作成
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Channel Modal */}
      {showEditChannelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-white">チャンネルを編集</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const name = (form.elements.namedItem('name') as HTMLInputElement).value;
              const description = (form.elements.namedItem('description') as HTMLTextAreaElement).value;
              const isPrivate = (form.elements.namedItem('isPrivate') as HTMLInputElement).checked;
              editChannel(editingChannel!.id, name, description, isPrivate);
            }}>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">チャンネル名</label>
                <input 
                  type="text" 
                  name="name" 
                  className="w-full p-2 bg-gray-700 rounded text-white" 
                  defaultValue={editingChannel?.name}
                  required 
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-300 mb-2">説明</label>
                <textarea 
                  name="description" 
                  className="w-full p-2 bg-gray-700 rounded text-white" 
                  rows={3}
                  defaultValue={editingChannel?.description}
                />
              </div>
              <div className="mb-4">
                <label className="flex items-center text-gray-300">
                  <input 
                    type="checkbox" 
                    name="isPrivate" 
                    className="mr-2" 
                    checked={editingChannel?.isPrivate}
                  />
                  プライベートチャンネル（招待されたメンバーのみアクセス可能）
                </label>
              </div>
              <div className="flex justify-end space-x-2">
                <button 
                  type="button" 
                  className="px-4 py-2 bg-gray-700 text-white rounded"
                  onClick={() => setShowEditChannelModal(false)}
                >
                  キャンセル
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
} 