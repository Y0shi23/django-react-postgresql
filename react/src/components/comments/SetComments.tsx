import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { addStylesheet, fetchData } from '../../function/function_list';

// コメントの型定義
interface Comment {
    user_name: string;
    comment: string;
}

// APIからのレスポンスの型定義
interface ApiResponse {
    comment: Comment[];
};


const SetComments  = () => {
    const { id } = useParams<{ id: string }>();
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);

    useEffect(() => {
        setComment();
    }, [id]);

    // コメント内容取得
    const setComment = async () => {
        const data = await fetchData<ApiResponse>(`http://fumi042-server.top/api/blog/${id}`);
        if (data) {
            setComments(data.comment);
            addStylesheet('static/css/blog.css');
            addStylesheet('static/css/comment.css');
        } else {
            setError('データの取得に失敗しました。');
            console.error('Failed to fetch posts.');
        }
        setLoading(false);
    };

    if (loading) return <p>読み込み中...</p>;
    if (error) return <p>エラーが発生しました: {error}</p>;
    if (!comments) return <p>記事が見つかりません。</p>;

    return (
        <div>
        <h3>コメント</h3>
        {comments.map((comment, index) => (
        <div key={index} className="comment">
            <div className="comment-header">
                <div className="comment-info">
                    <span className="comment-name">{comment.user_name}</span>
                </div>
            </div>
            <div className="comment-body">
                <p>{comment.comment}</p>
            </div>
        </div>
        ))}
        </div>
    );
};

export default SetComments;