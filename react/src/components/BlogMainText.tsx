import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import '../img_css/logo_0.css';
import { addStylesheet } from '../function/function_list';

// import Comment from './Comment.tsx';

interface Post {
    id: number;
    title: string;
    content: string;
}

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
  members: Article;
};

const BlogMainText: React.FC = () => {
    const [posts, setPosts] = useState<Post[]>([]);
    // URLからidを取得する場合
    const { id } = useParams<{ id: string }>();
    // 記事データの状態管理
    const [article, setArticles] = useState<Article | null>(null);
    // ローディング状態
    const [loading, setLoading] = useState<boolean>(true);
    // エラーメッセージ
    const [error, setError] = useState<string | null>(null);
    // 特定のページパスでのみCSSを適用
    // const isSpecificPage: boolean = location.pathname.startsWith(`/blog/${id}`);

    useEffect(() => {
        const fetchPosts = async () => {
        // idがない場合は処理を中断
            if (!id) return;
            try {
                //const data2 = await fetchData<Post[]>(`http://fumi042-server.top/api/blog/`); // URLを指定
                //setPosts(data2);
                //console.log(data2)
                const response = await fetch(`http://fumi042-server.top/api/blog/${id}`);

                if (!response.ok) {
                    throw new Error('データの取得に失敗しました');
                }
                const data: ApiResponse = await response.json();

                addStylesheet('static/css/blog.css')
                    
                // members オブジェクトを直接セット
                setArticles(data.members);
            } catch (error: unknown) {
                if (error instanceof Error) {
                    setError(error.message);
                } else {
                    setError('予期しないエラーが発生しました');
                }
            } finally {
                setLoading(false);
            }
        };
        fetchPosts(); // コンポーネントのマウント時にデータを取得
    }, [id]);

    if (loading) {
        return <p>読み込み中...</p>;
    }

    if (error) {
        return <p>エラーが発生しました: {error}</p>;
    }

    if (!article) {
        return <p>記事が見つかりません。</p>;
    }

    return (
        <>
          <main>
            <div></div>
            <div className="blog-container">
              <h1>{article.title}</h1>
              <div dangerouslySetInnerHTML={{ __html: article.content }} />
            </div>
            {/*フォームテンプレート*/}
            
          </main>
        </>
    );
};

export default BlogMainText;
