export function toFormUrlEncoded(params: { name: string; value: string }[]) {
    return params.map(p => `${encodeURIComponent(p.name)}=${encodeURIComponent(p.value)}`).join("&");
}

export function buildAutoSubmitHtml(actionUrl: string, params: { name: string; value: string }[], multipart: boolean) {
    const inputs = params
        .map(p => `<input type="hidden" name="${escapeHtml(p.name)}" value="${escapeHtml(p.value)}" />`)
        .join("");
    const enctype = multipart ? 'enctype="multipart/form-data"' : '';
    return `
        <!DOCTYPE html>
        <html><body>
            <form id="f" method="POST" ${enctype} action="${escapeHtml(actionUrl)}">
                ${inputs}
            </form>
            <script>document.getElementById('f').submit();</script>
        </body></html>
    `;
}

function escapeHtml(s: string) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}