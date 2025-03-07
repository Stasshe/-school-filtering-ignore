#@title arukan

!pip install requests beautifulsoup4 yt-dlp youtube-transcript-api ipywidgets selenium

import requests
import ipywidgets as widgets
from IPython.display import display, HTML, clear_output
import re
import random
from bs4 import BeautifulSoup
import yt_dlp
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import json
import os
import asyncio
from base64 import b64encode
from io import BytesIO
import base64


def download_thumbnail(video_id):
    os.makedirs('thumbnails', exist_ok=True)
    url = f"http://img.youtube.com/vi/{video_id}/mqdefault.jpg"
    local_path = f"thumbnails/{video_id}.jpg"

    try:
        # サムネイルのダウンロードと保存
        response = requests.get(url, stream=True)
        if response.status_code == 200:
            with open(local_path, 'wb') as f:
                for chunk in response.iter_content(1024):
                    f.write(chunk)
            return local_path
        return url  # 失敗時は元のURLを返す
    except Exception as e:
        print(f"サムネイルダウンロードエラー: {e}")
        return url

def get_thumbnail_data(video_id):
    local_path = download_thumbnail(video_id)
    try:
        with open(local_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    except:
        return ""  # エラー時は空データを返す

def get_video_info(video_id):
    """
    指定された動画IDから動画情報を取得する関数。
    """
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': True,
        'skip_download': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)

            return {
                'title': info.get('title', 'N/A'),
                'description': info.get('description', 'N/A'),
                'channel_name': info.get('channel', 'N/A'),
                'view_count': info.get('view_count', 0),
                'publish_date': info.get('upload_date', 'N/A'),
                'duration': info.get('duration', 0),
                'tags': info.get('tags', []),
                'thumbnail': info.get('thumbnail', ''),
            }
    except Exception as e:
        print(f"動画情報の取得に失敗しました: {e}")
        return None

def get_channel_videos(channel_id, max_results=5):
    """
    指定されたチャンネルIDから最新の動画を取得する関数。
    """
    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': True,
        'skip_download': True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # チャンネルURLから情報を取得
            channel_url = f"https://www.youtube.com/channel/{channel_id}"
            info = ydl.extract_info(channel_url, download=False)

            # 動画リストを抽出
            videos = info.get('entries', [])[:max_results]
            return [
                {
                    'id': video['id'],
                    'title': video['title'],
                    'uploader': video.get('uploader', ''),
                    'view_count': video.get('view_count', 0),
                    'webpage_url': video['url']
                }
                for video in videos
            ]
    except Exception as e:
        print(f"チャンネル動画の取得に失敗しました: {e}")
        return []

def get_related_videos(video_title, max_results=3):
    keywords = ' '.join(re.findall(r'\w+', video_title))
    videos, _ = search_videos(keywords, limit=max_results)
    return [{'id': video['id'], 'title': video['title']} for video in videos]

def play_video(url):
    print(f"再生開始: {url}")

    # ローカルファイルの場合
    if url.startswith('file://'):
        local_file_path = url[7:]  # 'file://' を除去
        with open(local_file_path, 'rb') as file:
            mp4 = file.read()
        data_url = "data:video/mp4;base64," + b64encode(mp4).decode()

        file_name = os.path.basename(local_file_path)

        player_html = create_video_player_html(
            video_url=data_url,
            title=file_name,
            description="ローカルファイル",
            channel_name="ローカル",
            view_count=0,
            publish_date="不明",
            related_videos=[],
            channel_videos=[],
            shortened_url=url,
            video_id="local",
            subtitle_data=[],
            is_local=True
        )

        clear_output(wait=True)
        display(HTML(player_html))
        return

    video_id = extract_video_id(url)
    if not video_id:
        print("Invalid URL")
        return

    # ストリームURLと字幕を取得
    stream_url, subtitle_data = get_stream_url_and_subtitles(url)
    if not stream_url:
        print("ストリームURLが取得できませんでした")
        return

    try:
        # yt-dlpで動画情報を取得
        video_info = get_video_info(video_id)
        if not video_info:
            print("動画情報が取得できませんでした")
            return

        # 投稿日時をフォーマット
        publish_date = datetime.strptime(video_info['publish_date'], "%Y%m%d").strftime("%Y-%m-%d")

        # 投稿者の動画2件を取得
        channel_query = f"channel:{video_info['channel_name']}"
        channel_videos, _ = search_videos(channel_query, limit=2)

        # タグに基づく関連動画2件をランダムに取得
        tags = video_info.get('tags', [])
        if tags:
            random_tag = random.choice(tags)
            related_videos, _ = search_videos(random_tag, limit=5)
            related_videos = random.sample(related_videos, min(2, len(related_videos)))
        else:
            related_videos = []

        # 重複を除去
        seen_ids = {video_id}
        filtered_channel_videos = []
        filtered_related_videos = []

        for video in channel_videos:
            if video['id'] not in seen_ids and len(filtered_channel_videos) < 2:
                seen_ids.add(video['id'])
                filtered_channel_videos.append({
                    'id': video['id'],
                    'title': video.get('title', ''),
                    'uploader': video.get('uploader', video_info['channel_name']),
                    'view_count': video.get('view_count', 0),
                    'webpage_url': f"https://www.youtube.com/watch?v={video['id']}"
                })

        for video in related_videos:
            if video['id'] not in seen_ids and len(filtered_related_videos) < 2:
                seen_ids.add(video['id'])
                filtered_related_videos.append({
                    'id': video['id'],
                    'title': video.get('title', ''),
                    'uploader': video.get('uploader', '不明'),
                    'view_count': video.get('view_count', 0),
                    'webpage_url': f"https://www.youtube.com/watch?v={video['id']}"
                })

        shortened_url = shorten_url(stream_url)

        player_html = create_video_player_html(
            video_url=stream_url,
            title=video_info['title'],
            description=video_info['description'],
            channel_name=video_info['channel_name'],
            view_count=video_info['view_count'],
            publish_date=publish_date,
            related_videos=filtered_related_videos,
            channel_videos=filtered_channel_videos,
            shortened_url=shortened_url,
            video_id=video_id,
            subtitle_data=subtitle_data,
            show_download_button=True
        )

        clear_output(wait=True)
        display(HTML(player_html))

    except Exception as e:
        print(f"エラーが発生しました: {e}")


def download_video(video_url):
    ydl_opts = {
        'format': 'best[ext=mp4]/best',  # MP4形式を優先し、なければ最高品質
        'outtmpl': '%(title)s.%(ext)s',
    }
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=True)
            filename = ydl.prepare_filename(info)

            # ダウンロード完了後すぐにプレーヤーを更新
            local_path = f"file://{filename}"
            play_video(local_path)

            return filename
    except Exception as e:
        print(f"ダウンロード失敗: {str(e)}")
        return None

def extract_video_id(url):
    patterns = [
        r'(?:v=|\/)([0-9A-Za-z_-]{11}).*',
        r'(?:embed\/|v\/|youtu.be\/)([0-9A-Za-z_-]{11})',
        r'(?:watch\?v=)([0-9A-Za-z_-]{11})'
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


# TinyURLのAPIでURLを短縮
def shorten_url(long_url):
    api_url = f"http://tinyurl.com/api-create.php?url={long_url}"
    response = requests.get(api_url)
    return response.text if response.status_code == 200 else long_url

# ファイル名のサニタイズ
def sanitize_filename(filename):
    return re.sub(r'[<>:"/\\|?*]', '', filename)

# 再生回数を日本語の概数に変換する関数
def format_view_count(view_count):
    if view_count >= 100000000:
        return f"{view_count // 100000000}億回"
    elif view_count >= 10000:
        return f"{view_count // 10000}万回"
    elif view_count >= 1000:
        return f"{view_count // 1000}千回"
    else:
        return f"{view_count}回"

# 検索機能をyt-dlpに変更
def search_videos(query, start=0, limit=50):
    ydl_opts = {
        'quiet': True,
        'extract_flat': True,
        'force_generic_extractor': True,
        'no_warnings': True,
        'playliststart': start + 1,
        'playlistend': start + limit
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            results = ydl.extract_info(f"ytsearch{limit}:{query}", download=False)
            videos = results['entries']
            return videos, len(videos) == limit
        except Exception as e:
            print(f"検索エラー: {e}")
            return [], False

def get_stream_url_and_subtitles(video_url):
    # Seleniumの設定
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")

    # Cookieを直接設定する方式に変更
    ydl_opts = {
        'format': 'best',
        'noplaylist': True,
        'skip_download': True,
        'writesubtitles': True,
        'writeautomaticsub': True,
        'subtitleslangs': ['ja'],
        'subtitlesformat': 'json3',
        'http_headers': {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        try:
            info = ydl.extract_info(video_url, download=False)
            stream_url = info['url']
        except Exception as e:
            print(f"ストリームURLの取得に失敗しました: {e}")
            return None, []

    subtitle_data = []
    # 手動字幕と自動生成字幕を結合
    subs = info.get('subtitles', {}).get('ja', [])
    auto_subs = info.get('automatic_captions', {}).get('ja', [])
    all_subs = subs + auto_subs
    for sub in all_subs:
        if sub.get('ext') == 'json3' and 'url' in sub:
            try:
                response = requests.get(sub['url'])
                if response.status_code == 200:
                    data = response.json()
                    for event in data.get('events', []):
                        if 'segs' in event:
                            text = ''.join(seg.get('utf8', '') for seg in event.get('segs', []))
                            start = event.get('tStartMs', 0) / 1000
                            duration = event.get('dDurationMs', 0) / 1000
                            subtitle_data.append({
                                'text': text.strip(),
                                'start': start,
                                'duration': duration
                            })
                    break
            except Exception as e:
                print(f"字幕の取得に失敗しました: {e}")

    return stream_url, subtitle_data

# HTMLプレーヤーと関連動画表示UI（関連動画5件に設定）
def create_video_player_html(video_url, title, description, channel_name, view_count, publish_date, related_videos, channel_videos, shortened_url, video_id, subtitle_data, show_recommend_button=False, show_download_button=False, is_local=False):
    import os
    import requests
    from base64 import b64encode

    def download_thumbnail(video_id):
        """動画IDを使用してサムネイル画像をダウンロードし、Base64エンコードされたデータを返す関数"""
        os.makedirs('thumbnails', exist_ok=True)
        url = f"http://img.youtube.com/vi/{video_id}/mqdefault.jpg"
        local_path = f"thumbnails/{video_id}.jpg"

        try:
            response = requests.get(url)
            if response.status_code == 200:
                with open(local_path, 'wb') as f:
                    f.write(response.content)
                with open(local_path, 'rb') as f:
                    return b64encode(f.read()).decode('utf-8')
            else:
                print(f"Failed to download thumbnail for video ID {video_id}")
                return ""
        except Exception as e:
            print(f"Error downloading thumbnail for video ID {video_id}: {e}")
            return ""

    # 関連動画のHTML生成部分
    related_videos_html = ''.join([
        f'''
        <div class="related-video">
            <div class="thumbnail-wrapper">
                <img src="data:image/jpeg;base64,{download_thumbnail(video['id'])}" alt="{video['title']}" class="related-thumbnail">
            </div>
            <div class="related-info">
                <h3>{video['title'][:30]}...</h3>
                <p>チャンネル: {video['uploader']}</p>
                <p>再生回数: {format_view_count(video.get('view_count', 0))}</p>
                <button onclick="playRelatedVideo('{video['webpage_url']}')" class="play-button">再生</button>
            </div>
        </div>
        '''
        for video in related_videos[:3] + channel_videos[:2]
    ])

    recommend_button = '''
    <button onclick="showRecommendedVideos()" class="play-button" style="margin-right: 10px;">おすすめ動画を表示</button>
    ''' if show_recommend_button else ''

    download_button = '''
    <button onclick="downloadVideo()" class="play-button" style="margin-top: 10px;">再生できない場合</button>
    ''' if show_download_button else ''

    player_html = f'''
    <style>
        .video-container {{
            display: flex;
            background-color: #f4f4f4;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            font-family: Arial, sans-serif;
        }}
        .video-player {{
            flex: 2;
            padding-right: 20px;
        }}
        .related-videos {{
            flex: 1;
            border-left: 2px solid #eaeaea;
            padding-left: 20px;
        }}
        .related-video {{
            display: flex;
            margin-bottom: 15px;
            background-color: #fff;
            padding: 10px;
            border-radius: 8px;
            transition: box-shadow 0.3s ease;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }}
        .related-video:hover {{
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }}
        .related-thumbnail {{
            width: 100px;
            height: 100px;
            object-fit: cover;
            border-radius: 5px;
        }}
        .related-info {{
            margin-left: 10px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        }}
        .play-button {{
            background-color: #007bff;
            color: white;
            border: none;
            padding: 10px 15px;
            cursor: pointer;
            border-radius: 5px;
            font-size: 14px;
            transition: background-color 0.3s ease;
        }}
        .play-button:hover {{
            background-color: #0056b3;
        }}
        .copy-button {{
            background-color: #28a745;
            color: white;
            border: none;
            padding: 10px;
            cursor: pointer;
            border-radius: 5px;
            font-size: 14px;
        }}
        h2 {{
            color: #333333;
        }}
        h3 {{
            margin-top: 0;
            font-size: 16px;
            color: #333333;
        }}
        .description {{
            margin-top: 10px;
            padding: 10px;
            background-color: #fff;
            border-radius: 5px;
            max-height: 200px;
            overflow-y: auto;
        }}
        .video-info {{
            margin-top: 10px;
            background-color: #fff;
            padding: 10px;
            border-radius: 5px;
        }}
        #loading {{
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            z-index: 9999;
            justify-content: center;
            align-items: center;
        }}
        .loader {{
            border: 5px solid #f3f3f3;
            border-top: 5px solid #3498db;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
        }}
        @keyframes spin {{
            0% {{ transform: rotate(0deg); }}
            100% {{ transform: rotate(360deg); }}
        }}
        #suggestions {{
            position: absolute;
            background-color: white;
            border: 1px solid #ddd;
            border-top: none;
            z-index: 99;
            width: calc(60% - 20px);
            max-height: 200px;
            overflow-y: auto;
        }}
        .suggestion {{
            padding: 10px;
            cursor: pointer;
        }}
        .suggestion:hover {{
            background-color: #f1f1f1;
        }}
        .subtitle-button {{
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 2;
            background-color: rgba(0, 0, 0, 0.5);
            color: white;
            border: none;
            padding: 5px;
            cursor: pointer;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            display: flex;
            justify-content: center;
            align-items: center;
        }}
        #subtitles {{
            position: absolute;
            bottom: 40px;
            left: 50%;
            transform: translateX(-50%);
            color: white;
            background-color: rgba(0, 0, 0, 0.7);
            padding: 5px;
            font-size: 16px;
            text-align: center;
            z-index: 1;
            cursor: move;
            user-select: none;
        }}
       </style>
    <div id="loading">
        <div class="loader"></div>
    </div>
    <div>
        <button onclick="showPreviousResults()" class="play-button" style="margin-right: 10px;">前回の検索結果を表示</button>
        {recommend_button}
    </div>
    <div style="margin-top: 10px; position: relative;">
        <input id="search-bar" placeholder="検索キーワードまたはYouTube URLを入力" type="text" style="padding: 10px; width: calc(60% - 20px); margin-right: 10px; border-radius: 5px; border: 1px solid #ccc;">
        <button onclick="searchVideos()" class="play-button">検索</button>
        <div id="suggestions"></div>
    </div>
    <div class="video-container">
        <div class="video-player">
            <h2>{title}</h2>
            <div style="position: relative;">
                <video id="videoPlayer" width="640" height="360" controls style="max-width: 100%; border-radius: 5px;">
                    <source src="{video_url}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>
                <button id="subtitleToggle" class="subtitle-button">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M1 4c0-1.1.9-2 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H3z"/>
                        <path d="M7 8.5h1.5a.5.5 0 0 1 0 1H7v1h2a.5.5 0 0 1 0 1H6.5v-3H9a.5.5 0 0 1 0 1H7v-1zm-3 0H2v1h1.5a.5.5 0 0 1 0 1h-2v-3h3a.5.5 0 0 1 0 1H4v1zm8 0h1.5a.5.5 0 0 1 0 1H12v1h2a.5.5 0 0 1 0 1h-2.5v-3H14a.5.5 0 0 1 0 1h-2v-1z"/>
                    </svg>
                </button>
                <div id="subtitles" style="display: none;"></div>
            </div>
            <div class="video-info">
                <p><strong>チャンネル名:</strong> {channel_name}</p>
                <p><strong>再生回数:</strong> {format_view_count(view_count)}</p>
                <p><strong>公開日:</strong> {publish_date}</p>
            </div>
            <div style="margin-top: 10px;">
                <input type="text" value="{shortened_url}" id="short-url" readonly style="width: calc(80% - 20px); padding: 10px; border-radius: 5px; border: 1px solid #ccc;">
                <button class="copy-button" onclick="copyToClipboard()">動画を共有</button>
            </div>
            <button onclick="toggleDescription()" class="play-button" style="margin-top: 10px;">概要を表示/非表示</button>
            <div id="description" class="description" style="display: none;">
                {description}
            </div>
            <button onclick="openCommentViewer('{video_id}')" class="play-button" style="margin-top: 10px;">コメントを表示</button>
            {download_button}
        </div>
        <div class="related-videos">
            <h2>関連動画</h2>
            {related_videos_html}
        </div>
    </div>
    <script>
            function showLoading() {{
            document.getElementById('loading').style.display = 'flex';
        }}
        function hideLoading() {{
            document.getElementById('loading').style.display = 'none';
        }}
        function playRelatedVideo(url) {{
            showLoading();
            google.colab.kernel.invokeFunction('notebook.play_video', [url], {{}});
        }}
        function searchVideos() {{
            showLoading();
            let query = document.getElementById("search-bar").value;
            google.colab.kernel.invokeFunction('notebook.on_search_button_click', [query, 1], {{}});
        }}
        function showPreviousResults() {{
            showLoading();
            google.colab.kernel.invokeFunction('notebook.show_previous_results', [], {{}});
        }}
        function showRecommendedVideos() {{
            showLoading();
            google.colab.kernel.invokeFunction('notebook.show_recommended_videos', [], {{}});
                }}
        function copyToClipboard() {{
            const urlInput = document.getElementById('short-url');
            urlInput.select();
            document.execCommand('copy');
            alert('URLがコピーされました: ' + urlInput.value);
        }}
        function toggleDescription() {{
            var desc = document.getElementById("description");
            if (desc.style.display === "none") {{
                desc.style.display = "block";
            }} else {{
                desc.style.display = "none";
            }}
        }}
        function openCommentViewer(videoId) {{
            window.open(`https://commentviewer.com/?v=${{videoId}}`, '_blank');
        }}
        let debounceTimer;
        const searchBar = document.getElementById('search-bar');
        const suggestionsDiv = document.getElementById('suggestions');
        searchBar.addEventListener('input', function() {{
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {{
                const query = this.value;
                if (query.length > 0) {{
                    google.colab.kernel.invokeFunction('notebook.get_suggestions', [query], {{}});
                }} else {{
                    suggestionsDiv.innerHTML = '';
                }}
            }}, 300);
        }});
        function displaySuggestions(suggestions) {{
            suggestionsDiv.innerHTML = '';
            suggestions.forEach(suggestion => {{
                const div = document.createElement('div');
                div.className = 'suggestion';
                div.textContent = suggestion;
                div.onclick = function() {{
                    searchBar.value = suggestion;
                    suggestionsDiv.innerHTML = '';
                    searchVideos();
                }};
                suggestionsDiv.appendChild(div);
            }});
        }}
        const video = document.getElementById('videoPlayer');
        const subtitlesDiv = document.getElementById('subtitles');
        const subtitleToggle = document.getElementById('subtitleToggle');
        const cues = {subtitle_data};
        let currentCueIndex = -1;
        let subtitlesEnabled = false;
        subtitleToggle.addEventListener('click', () => {{
            subtitlesEnabled = !subtitlesEnabled;
            subtitlesDiv.style.display = subtitlesEnabled ? 'block' : 'none';
        }});
        video.addEventListener('timeupdate', () => {{
            if (!subtitlesEnabled) return;
            const currentTime = video.currentTime;
            for (let i = 0; i < cues.length; i++) {{
                if (currentTime >= cues[i].start && currentTime <= (cues[i].start + cues[i].duration)) {{
                    if (currentCueIndex !== i) {{
                        subtitlesDiv.innerText = cues[i].text;
                        currentCueIndex = i;
                    }}
                    return;
                }}
            }}
            subtitlesDiv.innerText = '';
            currentCueIndex = -1;
        }});
        // 字幕のドラッグ機能
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        subtitlesDiv.addEventListener('mousedown', startDragging);
        subtitlesDiv.addEventListener('touchstart', startDragging);
        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag);
        document.addEventListener('mouseup', stopDragging);
        document.addEventListener('touchend', stopDragging);
        function startDragging(e) {{
            isDragging = true;
            startX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
            startY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
            startLeft = subtitlesDiv.offsetLeft;
            startTop = subtitlesDiv.offsetTop;
            e.preventDefault();
        }}
        function drag(e) {{
            if (!isDragging) return;
            const x = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
            const y = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
            const deltaX = x - startX;
            const deltaY = y - startY;
            subtitlesDiv.style.left = `${{startLeft + deltaX}}px`;
            subtitlesDiv.style.top = `${{startTop + deltaY}}px`;
        }}
        function stopDragging() {{
            isDragging = false;
        }}
        function downloadVideo() {{
            showLoading();
            google.colab.kernel.invokeFunction('notebook.download_video', ['{video_id}'], {{}});
        }}
    </script>
    '''
    return player_html

def display_results(results, query, show_recommend_button=False, is_recommended=False, current_page=1, total_pages=1):
    def download_thumbnail(video_id):
        """動画IDを使用してサムネイル画像をダウンロードし、Base64エンコードされたデータを返す関数"""
        url = f"http://img.youtube.com/vi/{video_id}/mqdefault.jpg"
        try:
            response = requests.get(url)
            if response.status_code == 200:
                return b64encode(response.content).decode('utf-8')
            else:
                print(f"Failed to download thumbnail for video ID {video_id}")
                return ""
        except Exception as e:
            print(f"Error downloading thumbnail for video ID {video_id}: {e}")
            return ""

    result_html = ''.join([
        f'''
        <div class="result-item">
            <div class="card">
                <img src="data:image/jpeg;base64,{download_thumbnail(video['id'])}" class="result-thumbnail">
                <div class="result-info">
                    <h3>{video.get('title', '')[:50]}</h3>
                    <p>チャンネル: {video.get('uploader', '不明')}</p>
                    <p>再生回数: {format_view_count(video.get('view_count', 0))}</p>
                    <button onclick="playVideo('{video.get('url', '')}')" class="play-button">再生</button>
                </div>
            </div>
        </div>
        '''
        for video in results if video is not None
    ])

    recommend_button = '''
    <button onclick="showRecommendedVideos()" class="play-button" style="margin-right: 10px;">おすすめ動画を表示</button>
    ''' if show_recommend_button else ''

    title = "あなたへのおすすめ" if is_recommended else f"検索結果: {query}"

    pagination_html = f'''
    <div class="pagination">
        <button onclick="changePage({current_page - 1})" class="play-button" {'disabled' if current_page == 1 else ''}>前のページ</button>
        <span>ページ {current_page} / {min(total_pages, 5)}</span>
        <button onclick="changePage({current_page + 1})" class="play-button" {'disabled' if current_page == min(total_pages, 5) else ''}>次のページ</button>
    </div>
    '''

    html_content = f'''
    <style>
        .result-item {{
            margin-bottom: 20px;
        }}
        .card {{
            display: flex;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            overflow: hidden;
            transition: box-shadow 0.3s;
        }}
        .card:hover {{
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }}
        .result-thumbnail {{
            width: 200px;
            height: 120px;
            object-fit: cover;
        }}
        .result-info {{
            padding: 10px;
            flex: 1;
        }}
        h3 {{
            margin: 5px;
            font-size: 16px;
            color: #333;
        }}
        p {{
            margin: 5px;
            font-size: 12px;
            color: #666;
        }}
        .play-button {{
            background-color: #007bff;
            color: white;
            border: none;
            padding: 10px 15px;
            cursor: pointer;
            border-radius: 5px;
            transition: background-color 0.3s ease;
        }}
        .play-button:hover {{
            background-color: #0056b3;
        }}
        .play-button:disabled {{
            background-color: #cccccc;
            cursor: not-allowed;
        }}
        #loading {{
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
            z-index: 9999;
            justify-content: center;
            align-items: center;
        }}
        .loader {{
            border: 5px solid #f3f3f3;
            border-top: 5px solid #3498db;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
        }}
        @keyframes spin {{
            0% {{ transform: rotate(0deg); }}
            100% {{ transform: rotate(360deg); }}
        }}
        .pagination {{
            display: flex;
            justify-content: center;
            align-items: center;
            margin-top: 20px;
        }}
        .pagination span {{
            margin: 0 10px;
        }}
        #suggestions {{
            position: absolute;
            background-color: white;
            border: 1px solid #ddd;
            border-top: none;
            z-index: 99;
            width: calc(60% - 20px);
            max-height: 200px;
            overflow-y: auto;
        }}
        .suggestion {{
            padding: 10px;
            cursor: pointer;
        }}
        .suggestion:hover {{
            background-color: #f1f1f1;
        }}
    </style>
    <div id="loading">
        <div class="loader"></div>
    </div>
    <h2>{title}</h2>
    <div>
        <button onclick="showPreviousResults()" class="play-button" style="margin-right: 10px;">前回の検索結果を表示</button>
        {recommend_button}
    </div>
    <div style="margin-top: 10px; position: relative;">
        <input id="search-bar" placeholder="検索キーワードまたはYouTube URLを入力" type="text" style="padding: 10px; width: calc(60% - 20px); margin-right: 10px; border-radius: 5px; border: 1px solid #ccc;">
        <button onclick="searchVideos()" class="play-button">検索</button>
        <div id="suggestions"></div>
    </div>
    <div>
        {result_html}
    </div>
    {pagination_html}
    <script>
        function showLoading() {{
            document.getElementById('loading').style.display = 'flex';
        }}
        function hideLoading() {{
            document.getElementById('loading').style.display = 'none';
        }}
        function playVideo(url) {{
            showLoading();
            google.colab.kernel.invokeFunction('notebook.play_video', [url], {{}});
        }}
        function searchVideos() {{
            showLoading();
            let query = document.getElementById("search-bar").value;
            google.colab.kernel.invokeFunction('notebook.on_search_button_click', [query, 1], {{}});
        }}
        function showPreviousResults() {{
            showLoading();
            google.colab.kernel.invokeFunction('notebook.show_previous_results', [], {{}});
        }}
        function showRecommendedVideos() {{
            showLoading();
            google.colab.kernel.invokeFunction('notebook.show_recommended_videos', [], {{}});
        }}
        function changePage(page) {{
            showLoading();
            google.colab.kernel.invokeFunction('notebook.change_page', [page], {{}});
        }}
        let debounceTimer;
        const searchBar = document.getElementById('search-bar');
        const suggestionsDiv = document.getElementById('suggestions');
        searchBar.addEventListener('input', function() {{
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {{
                const query = this.value;
                if (query.length > 0) {{
                    google.colab.kernel.invokeFunction('notebook.get_suggestions', [query], {{}});
                }} else {{
                    suggestionsDiv.innerHTML = '';
                }}
            }}, 300);
        }});
        function displaySuggestions(suggestions) {{
            suggestionsDiv.innerHTML = '';
            suggestions.forEach(suggestion => {{
                const div = document.createElement('div');
                div.className = 'suggestion';
                div.textContent = suggestion;
                div.onclick = function() {{
                    searchBar.value = suggestion;
                    suggestionsDiv.innerHTML = '';
                    searchVideos();
                }};
                suggestionsDiv.appendChild(div);
            }});
        }}
    </script>
    '''
    clear_output(wait=True)
    display(HTML(html_content))

# 検索機能
current_query = ""
current_page = 1
results_per_page = 10
all_results = []
related_words = []
current_related_word_index = 0

def on_search_button_click(query, page=1):
    global current_query, current_page, all_results, related_words, current_related_word_index
    if query.strip() == "":
        display_recommended_videos()
    elif query.startswith('https://www.youtube.com/') or query.startswith('https://youtu.be/'):
        play_video(query)
    else:
        current_query = query
        current_page = page
        all_results, has_more = search_videos(query, start=(page-1)*results_per_page, limit=results_per_page*5)
        total_pages = min((len(all_results) + results_per_page - 1) // results_per_page, 5)
        related_words = get_related_words(query)
        current_related_word_index = 0
        display_results(all_results[(page-1)*results_per_page:page*results_per_page], query, show_recommend_button=True, current_page=page, total_pages=total_pages)

# ページ変更
def change_page(page):
    global current_page, all_results, current_query, related_words, current_related_word_index
    current_page = page
    start = (page - 1) * results_per_page
    end = page * results_per_page

    if end > len(all_results):
        if current_related_word_index < len(related_words):
            related_word = related_words[current_related_word_index]
            current_related_word_index += 1
            new_query = f"{current_query} {related_word}"
            new_results, has_more = search_videos(new_query, start=0, limit=results_per_page)
            all_results.extend(new_results)
        else:
            new_results, has_more = search_videos(current_query, start=len(all_results), limit=results_per_page)
            all_results.extend(new_results)

    total_pages = min((len(all_results) + results_per_page - 1) // results_per_page, 5)
    display_results(all_results[start:end], current_query, show_recommend_button=True, current_page=page, total_pages=total_pages)

# 前回の検索結果を表示する関数
def display_previous_results():
    if current_query:
        on_search_button_click(current_query, current_page)

# おすすめ動画を表示する関数
def display_recommended_videos():
    recommended_queries = ["ホロライブ", "アニメ", "にじさんじ", "ゲーム実況", "テクノロジー 最新", "スポーツ ハイライト", "ボイスロイド", "ゆっくり解説", "ファッション トレンド", "反応集", "ゆっくり実況","イラスト","映画 レビュー", "切り抜き","ボイスロイド 解説"]
    query = random.choice(recommended_queries)
    on_search_button_click(query)

# サジェスト機能
def get_suggestions(query):
    url = f"http://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q={query}"
    response = requests.get(url)
    suggestions = response.json()[1]
    output.eval_js(f'displaySuggestions({suggestions})')

# 関連ワードを取得する関数
def get_related_words(query):
    url = f"http://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q={query}"
    response = requests.get(url)
    suggestions = response.json()[1]
    return suggestions[:5]  #

# コールバック登録
from google.colab import output
output.register_callback('notebook.play_video', play_video)
output.register_callback('notebook.on_search_button_click', on_search_button_click)
output.register_callback('notebook.show_previous_results', display_previous_results)
output.register_callback('notebook.show_recommended_videos', display_recommended_videos)
output.register_callback('notebook.change_page', change_page)
output.register_callback('notebook.get_suggestions', get_suggestions)
output.register_callback('notebook.download_video', download_video)

# 初期化（おすすめ動画を表示）
display_recommended_videos()