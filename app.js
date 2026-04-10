async function loadPage(page){
    const res = await fetch(`pages/${page}-content.html`);
    const html = await res.text();
    document.getElementById("app-content").innerHTML = html;
}

window.onload = () => loadPage("home");
