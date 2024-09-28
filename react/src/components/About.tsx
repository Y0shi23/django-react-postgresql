import '../css/about.css'

function About() {
    return (
        <>
        <h2 className="about-title">About Me.</h2>
        <div className="about-me">
            <div className="profile">
                <div className="profile-img"></div>
                <div className="profile-text">
                    <p className="profile-text768">1988年 沖縄県浦添市出身。</p>
                    <p>高校から大学までCS(情報処理)を専攻。</p>
                    <p>大学卒業後は東京と沖縄のSES企業にてITエンジニアデビューするも就業形態に適応できず2年半で退職。</p>
                    <p>その後も1年間の転職活動を経て2社目の就職をするも、激務に耐えきれずうつ病を発症。その後はしばらく休んで派遣やアルバイトにて就労するも半年で辞めるときもあれば1ヶ月も持たない事が続いてしまい、再起不能状態になってしまう。</p>
                    <p>知人のアドバイスも受けて2019年10月から2020年6月までの期間に就労移行支援に通いながら現職(2020年12月～)は株式会社ウェザーニューズで障がい者雇用にて復帰。社内のDX推進に従事し、業務プロセスの最適化に貢献しています。現在は転職と副業に向けてこのサイトを開設。</p>
                    <p></p>
                    <p>AIを活用できる人材になるために試行錯誤中</p>
                </div>
            </div>
        </div>

        <div className="project-card">
            <h3>Project 2</h3>
            <p>プロジェクトの説明をここに記載します。</p>
        </div>

        <section id="contact">
            <h2>Contact Me</h2>
            <p>連絡先やソーシャルメディアリンクをここに記載します。</p>
        </section>
        </>
    )
}

export default About
