'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Auth user type
type User = {
  id: string;
  username: string;
  email: string;
  createdAt: string;
};

// Auth context type
type AuthContextType = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
};

// Default auth context
const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  error: null,
});

// Auth provider props
type AuthProviderProps = {
  children: ReactNode;
};

// Auth provider component
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for token in localStorage on mount
  useEffect(() => {
    console.log('AuthContext initializing...');
    
    try {
      const storedToken = localStorage.getItem('token');
      console.log('AuthContext initialized, stored token:', storedToken ? `exists (${storedToken.length} chars)` : 'none');
      
      if (storedToken) {
        // トークンの形式を簡易チェック (JWTの基本形式チェック)
        const tokenParts = storedToken.split('.');
        if (tokenParts.length !== 3) {
          console.error('Invalid token format - not a valid JWT structure');
          localStorage.removeItem('token');
          setToken(null);
          setIsLoading(false);
          setError('無効なトークン形式です。再度ログインしてください。');
          return;
        }
        
        // トークンをステートに設定
        console.log('Setting token in state');
        setToken(storedToken);
        
        // 少し遅延してからユーザー情報を取得（ブラウザの初期化を待つ）
        setTimeout(() => {
          // ユーザー情報を取得
          console.log('Fetching user with stored token after delay');
          fetchUser(storedToken)
            .then(() => {
              console.log('User fetched successfully on init');
              // ユーザー情報の取得に成功したら、isAuthenticatedをtrueに設定
              setIsLoading(false);
            })
            .catch(err => {
              console.error('Error fetching user with stored token:', err);
              // トークンが無効な場合はクリア
              localStorage.removeItem('token');
              setToken(null);
              setUser(null);
              setError('認証に失敗しました。再度ログインしてください。');
              setIsLoading(false);
            });
        }, 500);
      } else {
        console.log('No token found, setting isLoading to false');
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error in AuthContext initialization:', error);
      setIsLoading(false);
      setError('認証状態の初期化中にエラーが発生しました');
    }
  }, []);

  // Fetch user data with token
  const fetchUser = async (authToken: string) => {
    try {
      setIsLoading(true);
      
      // トークンの簡易検証
      if (!authToken || authToken.trim() === '') {
        console.error('Empty token provided to fetchUser');
        throw new Error('認証トークンが空です');
      }
      
      console.log('ユーザー情報取得前のトークン:', authToken.substring(0, 10) + '...'); // セキュリティのため全トークンは表示しない
      
      // Use the API URL from environment variables or fallback to localhost
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const meUrl = `${apiUrl}/api/auth/me`;
      console.log('Using me URL:', meUrl);
      
      // バックエンドが期待する形式でトークンを送信
      // バックエンドは 'Authorization: Bearer {token}' 形式のみを受け付ける
      const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      };
      
      console.log('Sending request with Bearer token format');
      console.log('Request headers:', Object.keys(headers).join(', '));
      
      const response = await fetch(meUrl, {
        method: 'GET',
        headers: headers,
        credentials: 'include', // クッキーを含める
      });
      
      console.log('レスポンスステータス:', response.status);
      
      // レスポンスヘッダーをデバッグ用に表示
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      console.log('Response headers:', Object.keys(responseHeaders).join(', '));

      if (!response.ok) {
        // 認証エラーの場合はトークンをクリアする
        if (response.status === 401) {
          console.error('認証エラー: 401 Unauthorized');
          
          // レスポンスボディを取得して詳細なエラー情報を表示
          try {
            const errorBody = await response.text();
            console.error('Error response body:', errorBody);
            
            // JSONとしてパースを試みる
            try {
              const errorJson = JSON.parse(errorBody);
              console.error('Error details:', errorJson);
              
              // エラーメッセージがある場合は表示
              if (errorJson.message) {
                console.error('Error message from server:', errorJson.message);
                setError(`認証エラー: ${errorJson.message}`);
              } else if (errorJson.error) {
                console.error('Error message from server:', errorJson.error);
                setError(`認証エラー: ${errorJson.error}`);
              }
            } catch (jsonError) {
              console.error('Error response is not valid JSON');
            }
          } catch (e) {
            console.error('Failed to read error response body');
          }
          
          // トークンの詳細情報を出力（デバッグ用）
          try {
            const tokenParts = authToken.split('.');
            if (tokenParts.length === 3) {
              // ヘッダー部分をデコード
              const header = JSON.parse(atob(tokenParts[0]));
              console.error('Token header:', header);
              
              // ペイロード部分をデコード（機密情報は表示しない）
              const payload = JSON.parse(atob(tokenParts[1]));
              const safePayload = { ...payload };
              // 機密情報を削除
              delete safePayload.sub;
              delete safePayload.email;
              console.error('Token payload (partial):', safePayload);
              
              // 有効期限を確認
              if (payload.exp) {
                const expDate = new Date(payload.exp * 1000);
                const now = new Date();
                console.error('Token expiration:', expDate.toISOString());
                console.error('Current time:', now.toISOString());
                console.error('Token expired:', expDate < now);
                
                if (expDate < now) {
                  setError('トークンの有効期限が切れています。再度ログインしてください。');
                }
              }
            }
          } catch (tokenError) {
            console.error('Failed to decode token:', tokenError);
          }
          
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          if (!error) {
            setError('認証の有効期限が切れました。再度ログインしてください。');
          }
          return;
        }
        
        throw new Error('ユーザー情報の取得に失敗しました');
      }

      const userData = await response.json();
      console.log('User data fetched successfully');
      setUser(userData);
      setError(null);
    } catch (err) {
      console.error('Error fetching user:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Login function
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('Attempting to login with:', email);
      
      // Use the API URL from environment variables or fallback to localhost
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const loginUrl = `${apiUrl}/api/auth/login`;
      console.log('Using login URL:', loginUrl);
      
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Include cookies in the request
      });

      console.log('Login response status:', response.status);
      
      // レスポンスヘッダーをデバッグ用に表示
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      console.log('Response headers:', Object.keys(responseHeaders).join(', '));
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'ログイン処理中にエラーが発生しました' }));
        console.error('Login error:', errorData);
        
        if (response.status === 401) {
          throw new Error('メールアドレスまたはパスワードが正しくありません');
        }
        
        throw new Error(errorData.error || 'ログインに失敗しました');
      }

      const data = await response.json();
      console.log('Login response data keys:', Object.keys(data).join(', '));
      
      // トークンの検証
      if (!data.token) {
        throw new Error('サーバーからトークンが返されませんでした');
      }
      
      console.log('Login successful, token received:', data.token ? 'Yes (length: ' + data.token.length + ')' : 'No');
      
      // トークンをステートとローカルストレージに保存
      // 先にローカルストレージに保存してから、ステートを更新
      localStorage.setItem('token', data.token);
      console.log('Token saved to localStorage');
      
      // ローカルストレージに保存されたことを確認
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        console.error('Failed to save token to localStorage');
        throw new Error('ログイン情報の保存に失敗しました');
      }
      
      // ステートを更新
      setToken(data.token);
      console.log('Token state updated');
      
      // ユーザー情報を設定 (APIから返された場合)
      if (data.id && data.email) {
        setUser({
          id: data.id,
          username: data.username || email.split('@')[0], // ユーザー名がない場合はメールアドレスの@前を使用
          email: data.email,
          createdAt: data.createdAt || new Date().toISOString(),
        });
        console.log('User data set from login response');
      }
      
      // バックエンドの修正が完了するまでの一時的な対応策として、
      // ログイン成功時には即座にチャットページにリダイレクトする
      console.log('Redirecting to /chat immediately after successful login');
      window.location.href = '/chat';
      
      setError(null);
      
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'ログインに失敗しました');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (username: string, email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'アカウント登録に失敗しました');
      }

      const data = await response.json();
      setToken(data.token);
      setUser({
        id: data.id,
        username: data.username,
        email: data.email,
        createdAt: data.createdAt,
      });
      
      localStorage.setItem('token', data.token);
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'アカウント登録に失敗しました');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    console.log('Logging out user');
    
    // Clear user state
    setUser(null);
    setToken(null);
    setError(null);
    
    // Clear token from localStorage
    localStorage.removeItem('token');
    console.log('Token removed from localStorage');
    
    // Redirect to login page
    console.log('Redirecting to login page');
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        token,
        isAuthenticated: !!token,
        isLoading, 
        login, 
        register, 
        logout,
        error
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => useContext(AuthContext); 