import React, { useState } from 'react';

export interface Comment {
    user_name: string;
    comment: string;
    article: string;
}

interface CommentFormProps {
    articleId: string;
    onCommentSubmit: (newComment: Comment) => void;
}

const CommentForm: React.FC<CommentFormProps> = ({ articleId, onCommentSubmit }) => {
    const [userName, setUserName] = useState<string>('');
    const [comment, setComment] = useState<string>('');

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        const newComment: Comment = {
            user_name: userName,
            comment: comment,
            article: articleId
        };

        try {
            const response = await fetch(`/api/blog/${articleId}/comment/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(newComment),
            });

            if (!response.ok) {
                throw new Error('コメント投稿に失敗しました');
            }

            const data: Comment = await response.json();
            onCommentSubmit(data);
            setUserName('');
            setComment('');
        } catch (error) {
            console.error('Error:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input 
                type="text" 
                value={userName} 
                onChange={(e) => setUserName(e.target.value)} 
                placeholder="名前" 
                required 
            />
            <textarea 
                value={comment} 
                onChange={(e) => setComment(e.target.value)} 
                placeholder="コメントを入力" 
                required 
            />
            <button type="submit">コメント投稿</button>
        </form>
    );
};

export default CommentForm;
