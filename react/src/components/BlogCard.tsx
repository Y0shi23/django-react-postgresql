import React, { useEffect, useState } from 'react';
import { addStylesheet, fetchData } from '../function/function_list';
/* components */ 
import Header2 from './Header2';

// 記事データの型定義
type Article = {
    id: string;
    title: string;
    content: string;
    categoryes: string[];
};

// APIからのレスポンスの型定義
type ApiResponse = {
    request_url: string;
    status: string;
    members: Article[];
};

const BlogCard: React.FC = () => {
    // 記事データの状態管理
    const [articles, setArticles] = useState<Article[]>([]);
    // ローディング状態
    const [loading, setLoading] = useState<boolean>(true);
    // エラーメッセージ
    const [error, setError] = useState<string | null>(null);

    // Component.tsx
    const fetchPosts = async () => {
        const data = await fetchData<ApiResponse>(`http://fumi042-server.top/api/blog/`);
    
        if (data) { // エラーが発生していない場合
            setArticles(data.members);
            addStylesheet('static/css/styles4.css');
    
        } else {
            setError('データの取得に失敗しました。');
            console.error('Failed to fetch posts.');
        }
        setLoading(false)
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    if (loading) {
        return <p>読み込み中...</p>;
    }

    if (error) {
        return <p>エラーが発生しました: {error}</p>;
    }

    return (
        <>
            <main>
                <Header2 />
                <h1>ブログサイトへようこそ</h1>
                <div id="articles">
                    {articles.map((article: Article) => (
                        <article key={article.id}>
                            <img src="https://assets.st-note.com/production/uploads/images/25605918/rectangle_large_type_2_fac6c60b33965e2f893577cb2856460f.png?width=2000&height=2000&fit=bounds&quality=85" alt="記事タイトル 1のサムネイル"></img>
                            <h2>{article.title}</h2>
                            <div className="categories">
                                {/* カテゴリー名を取得 */}
                                {article.categoryes.map((categoryes: string) => (
                                    <span className="category">{categoryes}</span>
                                ))}
                            </div>
                            <a href={article.id}>続きを読む</a>
                        </article>
                    ))}
                </div>
            </main>
        </>
    );
};

export default BlogCard;
