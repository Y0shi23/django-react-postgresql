import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchData } from '../../function/function_list';

// コメントの型定義
interface Comment {
    user_name: string;
    comment: string;
    article: string;
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

const PostComment: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [comments, postComments] = useState<Comment[]>([]);
    const [name, setName] = useState('');
    const [commentText, setCommentText] = useState('');
    const [error, setError] = useState<string | null>(null);
    
    const handleAddComment = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        // CSRFトークンを取得
        const csrfToken = getCSRFToken();

        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': csrfToken,
            },
            body: JSON.stringify({
                user_name: name,
                comment: commentText,
                article: id
            }),
        };

        const data = await fetchData<Comment>(`/api/blog/${id}/comment/`, options);
        if(data) {
            const newComment = await data;
            postComments([...comments, newComment]);
            setName('');
            setCommentText('');
    
            // ページをリロード
            window.location.reload();
        } else {
            setError('コメントの投稿に失敗しました。');
            console.error('Failed to fetch posts.');
            console.error(error);
        }
    };
   
    return (
        <div>
        {/* コメントセクション */}
        <form onSubmit={handleAddComment} className="comment-form">
            <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="名前を入力してください"
                required
                className="input-name"
            />
            <textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="コメントを入力してください"
                rows={3}
                required
                className="input-comment"
            ></textarea>
            <button type="submit" className="submit-button">
                コメントを投稿
            </button>
        </form>
        </div>
    )
}

export default PostComment;