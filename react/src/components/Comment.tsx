function Comment() {
    return (
        <>

        <div className="comment-section">
            <div className="comment">
                <div className="comment-header">
                    <img src="user-icon.png" alt="User Icon" className="user-icon"></img>
                    <span className="username">@takachan_mix21 (たかちゃん)</span>
                    <span className="timestamp">2024-08-20 17:33</span>
                </div>
                <p className="comment-text">
                    小生、徳島出身なのでタイトルで気になり思わず全部見てしまいました🥺
                    行動力と交渉力がすごすぎです✨
                    これからも頑張ってください！
                </p>
                <div className="like">
                    <span>❤️ 1</span>
                </div>
            </div>
            <div className="comment-input">
                <textarea placeholder="テキストを入力"></textarea>
                <button className="submit-btn">投稿する</button>
            </div>
        </div>
    </>
    )
}

export default Comment
