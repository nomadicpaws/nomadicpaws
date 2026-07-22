import type { Context } from "@netlify/edge-functions";

// Shared navigation. Absolute paths keep links working from every subpage.
const NAV_HTML = `
<nav id="mainNav">
    <a href="/" class="nav-logo">Nomadic Paws</a>
    <ul class="nav-links">
        <li><a href="/blog.html">Trail Journal</a></li>
        <li><a href="/#about">About</a></li>
        <li><a href="/#watch">Watch</a></li>
        <li><a href="/#newsletter" class="nav-cta">Join the Pack</a></li>
    </ul>
</nav>
`;

const NAV_STYLES = `
<style id="np-shared-layout-styles">
    nav#mainNav {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 100;
        padding: 20px 40px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #FDFAF5;
        box-shadow: 0 1px 20px rgba(44,24,16,0.08);
        font-family: 'DM Sans', sans-serif;
    }

    #mainNav .nav-logo {
        font-family: 'Fraunces', serif;
        font-size: 1.4rem;
        font-weight: 700;
        color: #2C1810;
        text-decoration: none;
    }

    #mainNav .nav-links {
        display: flex;
        gap: 32px;
        align-items: center;
        list-style: none;
        margin: 0;
        padding: 0;
    }

    #mainNav .nav-links a {
        font-size: 0.875rem;
        font-weight: 500;
        color: #5C3D2E;
        text-decoration: none;
        letter-spacing: 0.03em;
        transition: color 0.2s;
    }

    #mainNav .nav-links a:hover { color: #C4622D; }

    #mainNav .nav-cta {
        font-size: 0.8rem;
        font-weight: 600;
        padding: 10px 22px;
        border-radius: 100px;
        background: #C4622D;
        color: white !important;
        text-decoration: none;
        transition: background 0.2s, transform 0.2s;
    }

    #mainNav .nav-cta:hover {
        background: #E8845A;
        transform: translateY(-1px);
    }

    body { padding-top: 76px; }

    #np-shared-footer ul {
        margin: 0;
        padding: 0;
    }

    @media (max-width: 768px) {
        nav#mainNav { padding: 16px 20px; }
        #mainNav .nav-links { display: none; }
        body { padding-top: 68px; }

        #np-shared-footer {
            padding: 48px 24px 28px !important;
        }

        #np-shared-footer .footer-grid {
            grid-template-columns: 1fr !important;
            gap: 30px !important;
        }
    }
</style>
`;

// Shared footer. Absolute paths keep links working from every subpage.
const FOOTER_HTML = `
<footer id="np-shared-footer" style="background:#2C1810;padding:64px 40px 32px;color:rgba(253,250,245,0.5);font-family:'DM Sans',sans-serif;">
    <div class="footer-grid" style="max-width:1100px;margin:0 auto 48px;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:48px;">
        <div>
            <span style="font-family:'Fraunces',serif;font-size:1.4rem;font-weight:700;color:#FDFAF5;margin-bottom:12px;display:block;">Nomadic Paws</span>
            <p style="font-size:0.88rem;line-height:1.7;max-width:220px;">Exploring the Sonoran Desert one trail at a time, with a cat who thinks he owns it.</p>
        </div>
        <div>
            <h4 style="font-size:0.78rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#FDFAF5;margin-bottom:16px;">Explore</h4>
            <ul style="list-style:none;">
                <li style="margin-bottom:10px;"><a href="/blog.html" style="color:rgba(253,250,245,0.5);text-decoration:none;font-size:0.88rem;">Trail Journal</a></li>
                <li style="margin-bottom:10px;"><a href="/#about" style="color:rgba(253,250,245,0.5);text-decoration:none;font-size:0.88rem;">About</a></li>
                <li style="margin-bottom:10px;"><a href="/#watch" style="color:rgba(253,250,245,0.5);text-decoration:none;font-size:0.88rem;">Watch</a></li>
            </ul>
        </div>
        <div>
            <h4 style="font-size:0.78rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#FDFAF5;margin-bottom:16px;">Follow</h4>
            <div style="display:flex;gap:16px;">
                <a href="https://tiktok.com/@nomadicpawstv" target="_blank" rel="noopener" aria-label="TikTok" style="color:rgba(253,250,245,0.5);font-size:1.15rem;text-decoration:none;"><i class="fab fa-tiktok"></i></a>
                <a href="https://youtube.com/@nomadicpawstv" target="_blank" rel="noopener" aria-label="YouTube" style="color:rgba(253,250,245,0.5);font-size:1.15rem;text-decoration:none;"><i class="fab fa-youtube"></i></a>
                <a href="https://instagram.com/nomadicpawstv" target="_blank" rel="noopener" aria-label="Instagram" style="color:rgba(253,250,245,0.5);font-size:1.15rem;text-decoration:none;"><i class="fab fa-instagram"></i></a>
            </div>
        </div>
        <div>
            <h4 style="font-size:0.78rem;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#FDFAF5;margin-bottom:16px;">Contact</h4>
            <ul style="list-style:none;">
                <li style="margin-bottom:10px;"><a href="mailto:hello@nomadicpaws.co" style="color:rgba(253,250,245,0.5);text-decoration:none;font-size:0.88rem;">hello@nomadicpaws.co</a></li>
                <li style="margin-bottom:10px;"><a href="/#newsletter" style="color:rgba(253,250,245,0.5);text-decoration:none;font-size:0.88rem;">Newsletter</a></li>
            </ul>
        </div>
    </div>
    <div style="max-width:1100px;margin:0 auto;padding-top:24px;border-top:1px solid rgba(253,250,245,0.08);display:flex;justify-content:space-between;align-items:center;font-size:0.78rem;flex-wrap:wrap;gap:8px;">
        <span>© 2026 Nomadic Paws. All rights reserved.</span>
        <span>Made with 🐾 in Tucson, AZ</span>
    </div>
</footer>
`;

const NAV_SCRIPT = `
<script>
  (function () {
    var nav = document.getElementById('mainNav');
    if (!nav) return;

    function updateNav() {
      nav.classList.toggle('scrolled', window.scrollY > 60);
    }

    updateNav();
    window.addEventListener('scroll', updateNav, { passive: true });
  })();
</script>
`;

export default async (_request: Request, context: Context) => {
    const response = await context.next();
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("text/html")) return response;

    return new HTMLRewriter()
        .on("#nav-slot", {
            element(element) {
                element.replace(NAV_STYLES + NAV_HTML, { html: true });
            },
        })
        .on("#footer-slot", {
            element(element) {
                element.replace(FOOTER_HTML + NAV_SCRIPT, { html: true });
            },
        })
        .transform(response);
};

// Include both the exact folder URL and every path underneath it.
export const config = {
    path: [
        "/checklist",
        "/checklist/*",
        "/cheetos-store",
        "/cheetos-store/*",
    ],
};
