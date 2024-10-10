import React from 'react';
import { useParams } from 'react-router-dom';
import Likes from './Likes';
import SetComments from './comments/SetComments';
import CommentForm from './comments/PostComment';

interface ArticleDetailProps {
    articleId: string;
}

const CommentSection: React.FC<ArticleDetailProps> = ({ articleId }) => {
    const { id } = useParams<{ id: string }>();

    return (
        <div>
            {/* いいねボタン */}
            <div className="like-button-container">
                {id && <Likes postId={id} />}
            </div>
            
            {/* コメントセクション */}
            <div className="comment-section">
                <SetComments />
                <CommentForm />
                {/*<CommentForm articleId={articleId} onCommentSubmit={handleCommentSubmit} />*/}
            </div>
        </div>
    );
};

export default CommentSection;
