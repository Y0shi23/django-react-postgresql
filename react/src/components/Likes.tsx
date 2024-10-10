import React, { useEffect, useState } from 'react';
import { fetchData } from '../function/function_list';

interface LikeButtonProps {
  postId: string; // postIdが必須のプロパティ
}

interface ApiResponse {
  like_count: number;
}

const getCSRFToken = () => {
  let csrfToken = '';
  const cookies = document.cookie.split(';');
  cookies.forEach(cookie => {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrftoken') {
      csrfToken = value;
    }
  });
  return csrfToken;
};

const Likes: React.FC<LikeButtonProps> = ({ postId }) => {
    const [liked, setLiked] = React.useState(false);
    const [likeCount, setLikeCount] = React.useState(0);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    


    // ページロード時にいいね数を取得する
    useEffect(() => {
        const fetchLikeCount = async () => {
            const data = await fetchData<ApiResponse>(`/api/blog/${postId}/like/`);
            if (data) {
              setLiked(true);
              setLikeCount(data.like_count);  // いいね数を更新
            } else {
              setError('データの取得に失敗しました。');
              console.error('Failed to fetch posts.');
              console.error(error);
            }
            setLoading(false);
        };
        fetchLikeCount();
    }, [postId]);

    const handleLikeClick = async () => {
        const csrfToken = getCSRFToken();  // CSRFトークンを取得
    
        const methods = {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': csrfToken,  // CSRFトークンをヘッダーに追加
            },
        }
    
        const data = await fetchData<ApiResponse>(`/api/blog/${postId}/like/`, methods);
        if (data) {
            setLiked(true);
            setLikeCount((prevCount) => prevCount + 1);
        } else {
            setError('データの取得に失敗しました。');
            console.error('Failed to fetch posts.');
            console.error(error);
        }
        setLoading(false);
    };

    if (error) return <p>エラーが発生しました: {error}</p>;
    
    return (
        <button onClick={handleLikeClick} className={`like-button ${liked ? 'liked' : ''}`}>
            <p>{liked ? '❤' : '♡'} {likeCount} </p>
        </button>
    );
};

export default Likes;
