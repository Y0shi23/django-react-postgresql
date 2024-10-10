// Component.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { addStylesheet, removeStylesheet, fetchData } from '../function/function_list';
import CommentSection from './CommentSection'; // コメントセクションのインポート
import Loading from './Loading'; // コメントセクションのインポート

interface Article {
    id: string;
    title: string;
    content: string;
    categoryes: string[];
}

// APIからのレスポンスの型定義
interface ApiResponse {
    request_url: string;
    status: string;
    members: Article;
};

const BlogMainText: React.FC = () => {
    // 記事データの状態管理
    const [article, setArticles] = useState<Article | null>(null);
    // URLからidを取得する場合
    const { id } = useParams<{ id: string }>();
    // ローディング状態
    const [loading, setLoading] = useState<boolean>(true);
    // エラーメッセージ
    const [error, setError] = useState<string | null>(null);

    // Component.tsx
    const fetchPosts = async () => {
        const data = await fetchData<ApiResponse>(`http://fumi042-server.top/api/blog/${id}`);

        if (data) { // エラーが発生していない場合
            setArticles(data.members);
            addStylesheet('static/css/blog.css');
            addStylesheet('static/css/loading.css');

        } else {
            setError('データの取得に失敗しました。');
            console.error('Failed to fetch posts.');
        }
        setLoading(false)
        removeStylesheet('static/css/loading.css');
    };

    useEffect(() => {
        fetchPosts();
    }, [id]);

    if (loading) {
        addStylesheet('static/css/loading.css');
        return <Loading />;
    }

    if (error) {
        return <p>エラーが発生しました: {error}</p>;
    }

    if (!article) {
        return <p>記事が見つかりません。</p>;
    }

    return (
        <main>
            <div className="blog-container">
            <h1>{article.title}</h1>
            <div dangerouslySetInnerHTML={{ __html: article.content }} />
            {id && <CommentSection articleId={id}/>}
        </div>
        {/* フォームテンプレート */}
        </main>
    );
};

export default BlogMainText;