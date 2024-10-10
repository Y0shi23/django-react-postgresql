import '../css/components/header.css'

function Header2() {
    return (
    <>
    {/*<!-- ヘッダー -->*/}
    <header>
        <nav className="navbar">
            <div className="logo">
                <a href="#">障がい者雇用で働くエンジニアのブログ</a>
            </div>
            <ul className="nav-links">
                <li><a href="#">Home</a></li>
                <li><a href="#">Services</a></li>
                <li><a href="#">About</a></li>
                <li><a href="#">Contact</a></li>
            </ul>
        </nav>
    </header>
    </>
    )
}

export default Header2
