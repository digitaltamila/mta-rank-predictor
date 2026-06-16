<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <title>Muppadai Rank Predictor API</title>
        <style>
            :root {
                --navy: #24318f;
                --yellow: #f5cd2f;
                --green: #147a4a;
                --cream: #f8f8ff;
                --white: #ffffff;
                --border: #e0e2f4;
                --ink: #182033;
                --muted: #667085;
            }

            * {
                box-sizing: border-box;
            }

            body {
                margin: 0;
                min-height: 100vh;
                display: grid;
                place-items: center;
                background: var(--cream);
                color: var(--ink);
                font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }

            main {
                width: min(480px, calc(100% - 32px));
                border: 1px solid var(--border);
                border-radius: 16px;
                background: var(--white);
                padding: 28px;
                text-align: center;
            }

            img {
                width: 72px;
                height: 72px;
                object-fit: contain;
                margin: 0 auto 14px;
            }

            p {
                margin: 0;
                color: var(--muted);
                line-height: 1.6;
            }

            h1 {
                margin: 0 0 8px;
                color: var(--navy);
                font-size: 24px;
                line-height: 1.2;
            }

            a {
                display: inline-flex;
                margin-top: 18px;
                border-radius: 8px;
                background: var(--navy);
                color: var(--white);
                padding: 10px 14px;
                font-size: 14px;
                font-weight: 800;
                text-decoration: none;
            }

            .status {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                margin-bottom: 14px;
                border-radius: 999px;
                background: #e8f5ee;
                color: var(--green);
                padding: 5px 10px;
                font-size: 12px;
                font-weight: 800;
            }

            .status::before {
                content: "";
                width: 7px;
                height: 7px;
                border-radius: 999px;
                background: var(--green);
            }
        </style>
    </head>
    <body>
        <main>
            <img
                src="https://firebasestorage.googleapis.com/v0/b/muppadai-book-store.firebasestorage.app/o/settings%2Flogo.png?alt=media&token=ebf191ce-e21d-4aee-a487-181b2d81592e"
                alt="Muppadai Academy"
            >
            <div class="status">API Online</div>
            <h1>Muppadai Rank Predictor API</h1>
            <p>Laravel API service for response sheet parsing, scoring, ranking, and cutoff prediction.</p>
            <a href="/api/v1/health">Check Health</a>
        </main>
    </body>
</html>
