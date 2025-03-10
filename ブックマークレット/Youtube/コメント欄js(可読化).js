(function () {
    const apiKey = 'YOUR API KEY';
    const currentUrl = window.location.href;
    const videoIdMatch = currentUrl.match(/\/embed\/([a-zA-Z0-9_-]{11})/);

    if (!videoIdMatch) {
        alert('動画IDをURLから取得できませんでした。');
        return;
    }

    const videoId = videoIdMatch[1];
    document.head.innerHTML = '';
    document.body.innerHTML = '';

    const videoApiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoId}&key=${apiKey}`;
    const commentApiUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&key=${apiKey}&order=relevance&maxResults=20`;

    fetch(videoApiUrl)
        .then(res => res.json())
        .then(data => {
            if (!data.items || !data.items.length) {
                alert('動画情報の取得に失敗しました。');
                return;
            }

            const { title, description } = data.items[0].snippet;
            const { viewCount } = data.items[0].statistics;

            const container = document.createElement('div');
            container.style = `
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                background-color: white;
                padding: 40px;
                box-sizing: border-box;
                font-family: Arial, sans-serif;
                min-height: 100vh;
            `;
            document.body.appendChild(container);

            const videoWrapper = document.createElement('div');
            videoWrapper.style = `
                position: relative;
                width: 100%;
                max-width: 800px;
                padding-bottom: 56.25%;
                height: 0;
                overflow: hidden;
                margin-bottom: 30px;
            `;

            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}`;
            iframe.style = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                border: none;
            `;

            videoWrapper.appendChild(iframe);
            container.appendChild(videoWrapper);

            const embedLink = document.createElement('div');
            embedLink.style = "margin-top:10px; font-size:18px; font-weight:bold;";
            embedLink.innerHTML = `<a href="https://www.youtube-nocookie.com/embed/${videoId}" style="text-decoration:none; color:blue;" target="_self">https://www.youtube-nocookie.com/embed/${videoId}</a>`;
            container.appendChild(embedLink);

            const info = document.createElement('div');
            info.style = `
                margin-top: 30px;
                padding: 20px;
                background-color: rgba(0, 0, 0, 0.8);
                color: white;
                border-radius: 8px;
                width: 100%;
                max-width: 800px;
                text-align: left;
            `;
            info.innerHTML = `
                <strong>タイトル:</strong> ${title}<br>
                <strong>概要:</strong> ${description}<br>
                <strong>視聴回数:</strong> ${viewCount}回
            `;
            container.appendChild(info);

            let allComments = [];
            let fetchCount = 0;

            function fetchComments(pageToken = '') {
                if (fetchCount >= 9) {
                    displayComments(allComments);
                    return;
                }

                let url = `${commentApiUrl}${pageToken ? `&pageToken=${pageToken}` : ''}`;

                fetch(url)
                    .then(res => res.json())
                    .then(commentData => {
                        if (!commentData.items || !commentData.items.length) {
                            alert('コメントはまだありません。');
                            return;
                        }

                        allComments = [...allComments, ...commentData.items];
                        fetchCount++;

                        if (commentData.nextPageToken && fetchCount < 9) {
                            fetchComments(commentData.nextPageToken);
                        } else {
                            displayComments(allComments);
                        }
                    })
                    .catch(() => alert('コメントの取得に失敗しました。'));
            }

            function displayComments(comments) {
                const sortedComments = comments.sort((a, b) => {
                    const aLikes = a.snippet.topLevelComment.snippet.likeCount;
                    const bLikes = b.snippet.topLevelComment.snippet.likeCount;
                    return bLikes - aLikes;
                });

                const commentContainer = document.createElement('div');
                commentContainer.style = `
                    margin-top: 20px;
                    padding: 20px;
                    background-color: rgba(255, 255, 255, 0.9);
                    border-radius: 8px;
                    width: 100%;
                    max-width: 800px;
                    text-align: left;
                `;

                sortedComments.forEach(comment => {
                    const { authorDisplayName, textDisplay, likeCount } = comment.snippet.topLevelComment.snippet;
                    const commentElement = document.createElement('div');
                    commentElement.style = `
                        margin-bottom: 15px;
                        padding: 10px;
                        background-color: #f1f1f1;
                        border-radius: 4px;
                    `;
                    commentElement.innerHTML = `
                        <strong>${authorDisplayName}</strong><br>
                        ${textDisplay}<br>
                        <small>👍 ${likeCount}</small>
                    `;
                    commentContainer.appendChild(commentElement);
                });

                container.appendChild(commentContainer);
            }

            fetchComments();
        })
        .catch(() => alert('動画情報の取得に失敗しました。'));
})();
