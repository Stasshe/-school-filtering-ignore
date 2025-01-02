'''
V1.0 初版
V2.0 画像ダウンロードに対応、より多くのサイトに対応できるように保存方法を変更
V2.1 ダウンロード中に状態をConsoleに出力
V2.2 履歴自動削除
V2.21 ユーザーエージェントを変更
V3.0 V1.0とV2.2を統合、同時閲覧が高速にできるように、portを8010-8029まで使用可能にし、自動で移行
    admin機能追加
V3.1 画像大量ダウンロード防止、デフォルトも変えられる
V3.14 デフォルト自動変更機能搭載
V3.2 検索機能追加
'''




#Config ユーザーが変更できる値たち

#1.Default_img_download=True usualだけの話。 --default=True
Default_img_download=True
#上のデフォルトを自動変更するサイト
Default_img_dl_ignore=['Google']
#Exceptions --default= ex=['qiita.com','quora.com'] whether include url
ex=['qiita.com','quora.com']
#auto open webbrowser --default=True
auto_open=True
#search open webbrowser --default=False
se_auto_open=True


import time
import os
import shutil

# カレントディレクトリの "saved_webpage" フォルダのパスを指定
folder_path = os.path.join(os.getcwd(), "saved_webpage")

# フォルダが存在する場合に削除
if os.path.exists(folder_path):
    shutil.rmtree(folder_path)
    print('履歴を削除しました。')
    #print(f"{folder_path} を削除しました。")
else:
    print('履歴はありません。')
    #print(f"{folder_path} は存在しません。")




import os
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import base64
import re



# 偽装

headers = {
    'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
    #'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.61 Safari/537.36',
    #'Referer': 'https://example.com/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3'
}

#----------------------------------mainly use usual
#----------------------------------mainly use usual
#----------------------------------mainly use usual
#----------------------------------mainly use usual
#----------------------------------mainly use usual
#----------------------------------mainly use usual
#----------------------------------mainly use usual
#----------------------------------mainly use usual
#----------------------------------mainly use usual
#----------------------------------mainly use usual
#----------------------------------mainly use usual
#----------------------------------mainly use usual
#----------------------------------mainly use usual
#----------------------------------mainly use usual
def save_webpage(url, save_folder):
    global Default_img_download
    # フォルダの作成
    os.makedirs(save_folder, exist_ok=True)

    # HTMLを取得
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.content, 'html.parser')

    # <html>が存在しない場合は新たに作成
    if soup.html is None:
        soup.html = soup.new_tag('html')
        soup.append(soup.html)
    
    #ゲーム関係なら自動でデフォルトを変更
    title_name = soup.title.string.strip() if soup.title else 'website_data'
    print(f'このwebサイトのタイトルは{title_name}です。')
    if any(substring in title_name for substring in Default_img_dl_ignore):
        if Default_img_download==False:
            Default_img_download=True
            print('画像ダウンロードデフォルトの引値をTrueに変更しました。')
            

    # MathJaxのスクリプトと設定を<head>に追加
    if soup.head is None:
        soup.head = soup.new_tag('head')
        soup.html.insert(0, soup.head)
    
    if 'math' in title_name or '数学' in title_name:
        print('数学系')
        # MathJaxスクリプトを追加
        mathjax_script = soup.new_tag('script', src="https://cdnjs.cloudflare.com/ajax/libs/mathjax/3.2.0/es5/tex-mml-chtml.js")
        mathjax_config = soup.new_tag('script')
        mathjax_config.string = r"""
        window.MathJax = {
        tex: {
            inlineMath: [['\(', '\)']],
            displayMath: [['$$', '$$'], ['\[', '\]']]
        }
        };
        """
        soup.head.append(mathjax_config)
        soup.head.append(mathjax_script)

    # リソースの保存フォルダを作成
    resources_folder = os.path.join(save_folder, 'resources')
    os.makedirs(resources_folder, exist_ok=True)

    def save_resource(tag, attribute, resource_folder):
        resources = soup.find_all(tag)
        total_resources = len(resources)

        for index, element in enumerate(resources):
            resource_url = element.get(attribute)

            if resource_url:
                if resource_url.startswith('data:'):
                    match = re.match(r'data:(image/\w+);base64,(.*)', resource_url)
                    if match:
                        mime_type, base64_data = match.groups()
                        extension = mime_type.split('/')[-1]
                        resource_name = f"embedded_image.{extension}"
                        resource_path = os.path.join(resource_folder, resource_name)

                        with open(resource_path, 'wb') as f:
                            f.write(base64.b64decode(base64_data))

                        element[attribute] = os.path.join(os.path.basename(resource_folder), resource_name)
                    continue

                full_resource_url = urljoin(url, resource_url)
                parsed_url = urlparse(full_resource_url)

                # リソースをダウンロード
                try:
                    resource_response = requests.get(full_resource_url, headers=headers, stream=True)
                    response.encoding = response.apparent_encoding  # 自動検出されたエンコーディングに設定

                    resource_response.raise_for_status()
                except requests.exceptions.RequestException as e:
                    print(f"Failed to download {full_resource_url}: {e}")
                    continue

                resource_name = os.path.basename(parsed_url.path)
                if not resource_name:
                    continue

                resource_path = os.path.join(resource_folder, resource_name)

                with open(resource_path, 'wb') as f:
                    for chunk in resource_response.iter_content(chunk_size=8192):
                        f.write(chunk)

                # 進行状況の表示
                progress = (index + 1) / total_resources * 100
                print(f"Saving {tag} {index + 1}/{total_resources}: {progress:.2f}% complete")

                element[attribute] = os.path.join(os.path.basename(resource_folder), resource_name)

    # srcset属性のリソースを保存する関数
    def save_srcset_resources(resource_folder):
        for img in soup.find_all('img'):
            if 'srcset' in img.attrs:
                srcset_values = img['srcset'].split(',')
                new_srcset = []

                for src in srcset_values:
                    # URL部分のみを抽出
                    try:
                        resource_url = src.split()[0]
                    except:
                        pass
                    full_resource_url = urljoin(url, resource_url)

                    try:
                        resource_response = requests.get(full_resource_url, headers=headers, stream=True)
                        resource_response.raise_for_status()
                    except requests.exceptions.RequestException as e:
                        print(f"Failed to download {full_resource_url}: {e}")
                        continue

                    resource_name = os.path.basename(urlparse(full_resource_url).path)
                    resource_path = os.path.join(resource_folder, resource_name)

                    with open(resource_path, 'wb') as f:
                        for chunk in resource_response.iter_content(chunk_size=8192):
                            f.write(chunk)

                    # srcset用の新しいURLパス
                    new_srcset.append(f"{os.path.join(os.path.basename(resource_folder), resource_name)} {src.split()[1]}")

                # srcsetの置き換え
                img['srcset'] = ", ".join(new_srcset)

    def check_large_img():
        # 画像ファイルのダウンロードと保存
        img_links = [img.get('src') for img in soup.find_all('img')]
                
        if Default_img_download :
            # 画像データの数をチェック
            if len(img_links) > 55:
                confirmation = input(f"画像データが{len(img_links)}個あります。開くまでに時間がかかります。ダウンロードしますか？しない場合でも、画像は表示されませんがそれ以外はできます。 (y/n): ")
                if confirmation.lower() != 'y':
                    print("画像のダウンロードは中止しました。")
                else:
                    print("画像ダンロードをします。")
                    save_resource('img', 'src', resources_folder)
                
            else:
                print('画像ダウンロードします。')
                save_resource('img', 'src', resources_folder)
        else:
            print('Default_img_downloadがTrueでないので、自動的に画像ダウンロードを省きました。')

    # リソースの保存を行う
    check_large_img()
    save_srcset_resources(resources_folder)
    save_resource('link', 'href', resources_folder)
    save_resource('script', 'src', resources_folder)
    
    
    # 不要なスクリプトの削除
    for script in soup.find_all('script', src=True):
        if "v3-article-bundle-" in script['src']:
            script.decompose()
    
    # HTMLを保存
    html_file_path = os.path.join(save_folder, 'index.html')
    with open(html_file_path, 'w', encoding='utf-8') as f:
        f.write(soup.prettify())

    print(f"Web page saved at {html_file_path}")
    return save_folder

#----------------------------------exception
#----------------------------------exception
#----------------------------------exception
#----------------------------------exception
#----------------------------------exception
#----------------------------------exception
#----------------------------------exception
#----------------------------------exception
#----------------------------------exception
#----------------------------------exception
#----------------------------------exception
#----------------------------------exception
#----------------------------------exception
#----------------------------------exception
#----------------------------------exception
#----------------------------------exception
#----------------------------------exception

# グローバル変数の定義
folder_name_global = None
folder_path_global = None

import requests
from urllib.parse import urljoin, urlparse


def save_content(url):
    global folder_name_global
    global folder_path_global

    try:
        # Webページの内容を取得
        response = requests.get(url, headers=headers)
        response.raise_for_status()  # ステータスコードが200でなければ例外を発生させる

        # BeautifulSoupでパース
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # カレントディレクトリに "saved_webpage" フォルダがなければ作成
        folder_path = os.path.join(os.getcwd(), "saved_webpage")
        if not os.path.exists(folder_path):
            os.makedirs(folder_path)
        folder_path_global = folder_path
        print('Folder Path: ' + str(folder_path_global))
        
        # HTMLファイルとして保存
        html_file_path = os.path.join(folder_path, 'index.html')
        with open(html_file_path, 'w', encoding='utf-8') as file:
            file.write(response.text)
        #print(f'HTML saved as {html_file_path}')

        # CSSファイルのダウンロードと保存
        css_links = [link.get('href') for link in soup.find_all('link', rel='stylesheet')]
        total_css = len(css_links)
        for index, css_link in enumerate(css_links):
            css_url = urljoin(url, css_link)
            try:
                css_response = requests.get(css_url, headers=headers)
                css_response.raise_for_status()
                css_file_name = os.path.basename(urlparse(css_url).path)
                if css_file_name:
                    css_file_path = os.path.join(folder_path, css_file_name)
                    with open(css_file_path, 'w', encoding='utf-8') as file:
                        file.write(css_response.text)
                    #print(f'CSS saved as {css_file_path}')
            except requests.exceptions.RequestException as e:
                print(f"Failed to download CSS {css_url}: {e}")
            finally:
                # 進行状況の表示
                progress = (index + 1) / total_css * 100
                print(f"Downloading CSS: {index + 1}/{total_css} ({progress:.2f}%) complete")

        # JSファイルのダウンロードと保存
        js_links = [script.get('src') for script in soup.find_all('script') if script.get('src')]
        total_js = len(js_links)
        for index, js_link in enumerate(js_links):
            js_url = urljoin(url, js_link)
            try:
                js_response = requests.get(js_url, headers=headers)
                js_response.raise_for_status()
                js_file_name = os.path.basename(urlparse(js_url).path)
                if js_file_name:
                    js_file_path = os.path.join(folder_path, js_file_name)
                    with open(js_file_path, 'w', encoding='utf-8') as file:
                        file.write(js_response.text)
                    #print(f'JS saved as {js_file_path}')
            except requests.exceptions.RequestException as e:
                print(f"Failed to download JS {js_url}: {e}")
            finally:
                # 進行状況の表示
                progress = (index + 1) / total_js * 100
                print(f"Downloading JS: {index + 1}/{total_js} ({progress:.2f}%) complete")
        
        
                
        # 画像ファイルのダウンロードと保存
        img_links = [img.get('src') for img in soup.find_all('img')]
        total_imgs = len(img_links)
        for index, img_link in enumerate(img_links):
            img_url = urljoin(url, img_link)
            try:
                img_response = requests.get(img_url, headers=headers)
                img_response.raise_for_status()
                img_file_name = os.path.basename(urlparse(img_url).path)
                if img_file_name:
                    img_file_path = os.path.join(folder_path, img_file_name)
                    with open(img_file_path, 'wb') as file:  # バイナリモードで保存
                        file.write(img_response.content)
                    print(f'Image saved as {img_file_path}')
            except requests.exceptions.RequestException as e:
                print(f"Failed to download Image {img_url}: {e}")
            finally:
                # 進行状況の表示
                progress = (index + 1) / total_imgs * 100
                print(f"Downloading Image: {index + 1}/{total_imgs} ({progress:.2f}%) complete")

        print("All content saved successfully!")
        
    except Exception as e:
        print(f"An error occurred: {e}")

#----------------------------------shell-----------------------------
#----------------------------------shell-----------------------------
#----------------------------------shell-----------------------------
#----------------------------------shell-----------------------------
#----------------------------------shell-----------------------------
#----------------------------------shell-----------------------------
#----------------------------------shell-----------------------------
#----------------------------------shell-----------------------------
#----------------------------------shell-----------------------------
#----------------------------------shell-----------------------------
#----------------------------------shell-----------------------------
#----------------------------------shell-----------------------------
#----------------------------------shell-----------------------------
#----------------------------------shell-----------------------------
#----------------------------------shell-----------------------------
#----------------------------------shell-----------------------------
#----------------------------------shell-----------------------------

print('URLを入力し、Enterを押してください。')
url=input('command or url=')
if url=="":
    print('中止')
    exit()
print('読み込み中、そのまま待ってください。')

def admin():
    global url
    admin_ans=input('which script do you run?[usual,exception]=')
    if mode!='search':
        url=input('url=')
    if admin_ans=="usual":
        print('一般処理です。')
        save_folder = "./saved_webpage"
        save_webpage(url, save_folder)
    elif admin_ans=="exception":
        print('例外処理を起動しました。')
        save_content(url)
    else:
        print('not defined admin_Command')
        exit()
    
mode=''
if url=='admin':
    admin()
elif url=='search':
    mode='search'
    print("Which engine? / 1. Google / 2. Bing / 3. DuckDuckGo")
    engine = input("Answer by the number: ")
    
    print("Choose search type / 1. Normal search / 2. Image search / 3. Video search")
    search_type = input("Answer by the number: ")
    search_query = input("Enter your search query: ")
    
    url = ""
    if se_auto_open ==False:
        auto_open=False
        print('検索システムでは、プライベートタブの選択ができるように、自動で開かないようになっています。')
    
    if engine == "1":  # Google
        if search_type == "1":
            url = f"https://www.google.com/search?q={search_query}"
        elif search_type == "2":
            url = f"https://www.google.com/search?tbm=isch&q={search_query}"
        elif search_type == "3":
            url = f"https://www.google.com/search?tbm=vid&q={search_query}"
    
    elif engine == "2":  # Bing
        if search_type == "1":
            url = f"https://www.bing.com/search?q={search_query}"
        elif search_type == "2":
            url = f"https://www.bing.com/images/search?q={search_query}"
        elif search_type == "3":
            url = f"https://www.bing.com/videos/search?q={search_query}"
    
    elif engine == "3":  # DuckDuckGo
        if search_type == "1":
            url = f"https://duckduckgo.com/?q={search_query}"
        elif search_type == "2":
            url = f"https://duckduckgo.com/?q={search_query}&iax=images&ia=images"
        elif search_type == "3":
            url = f"https://duckduckgo.com/?q={search_query}&iax=videos&ia=videos"
    
    ad_s=input('Press Enter key or admin:')
    # URLの出力
    if url:
        if ad_s=='admin':
            admin()
        else:
            print('一般処理です。')
            save_folder="./saved_webpage"
            save_webpage(url,save_folder)
    else:
        print('Canceled')
        exit()
    
    
else:
    if any(substring in url for substring in ex):
        print('例外処理を起動しました。')
        save_content(url)
    else:
        print('一般処理です。')
        save_folder = "./saved_webpage"
        save_webpage(url, save_folder)

print('完了')


import http.server
import socketserver
import webbrowser
import os

def start_server(directory, start_port=8010, end_port=8029, auto_op_web=True):
    os.chdir(directory)  # 指定されたディレクトリに移動

    handler = http.server.SimpleHTTPRequestHandler

    for port in range(start_port, end_port + 1):
        try:
            with socketserver.TCPServer(("", port), handler) as httpd:
                url = f"http://localhost:{port}"
                print(f"Serving at port {port}")

                
                # auto_op_webがTrueのときのみ自動でブラウザを開く
                if auto_op_web:
                    time.sleep(0.5)
                    webbrowser.open(url)
                else:
                    print(f'自分で直接ブラウザに入力してください。{url}')
                httpd.serve_forever()
                
                break  # サーバーが正常に起動したらループを抜ける
        except OSError as e:
            if 'Address already in use' in str(e):
                print(f"Port {port} が既に使われていました。次のport {port+1} へ自動移行します。...")
            else:
                print(f"An error occurred: {e}")
                break
    else:
        print(f"全てのport {start_port} から {end_port} が使用されていました。.")
        print('何かのエラーですので、1分ほど待ってから、')
        print('replitのページまたはPython Editorをもう一度開き直してください。')

# フォルダ名とポート番号を設定
directory_to_serve = 'saved_webpage'

# 自動でサイトを開くかどうかを選択
#auto_open = input("Auto-open web? (y/n): ").strip().lower() == 'y'

# サーバーを開始
start_server(directory_to_serve, auto_op_web=auto_open)
