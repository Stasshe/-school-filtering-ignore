(function() {
    const existingPanel = document.getElementById('html-editor-panel');
    if (existingPanel) {
        existingPanel.remove();
        return;
    }

    const style = document.createElement('style');
    style.textContent = `
        #html-editor-panel {
            position: fixed;
            top: 0;
            right: 0;
            width: 40%;
            height: 100vh;
            background: #1e1e1e;
            box-shadow: -4px 0 12px rgba(0,0,0,0.3);
            z-index: 999999;
            display: flex;
            flex-direction: column;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            transition: transform 0.3s ease;
        }
        
        #html-editor-header {
            background: #2d2d2d;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #3e3e3e;
            flex-shrink: 0;
        }
        
        #html-editor-title {
            color: #e0e0e0;
            font-size: 14px;
            font-weight: 600;
            letter-spacing: 0.5px;
        }
        
        #html-editor-controls {
            display: flex;
            gap: 8px;
        }
        
        .html-editor-btn {
            background: #3c3c3c;
            color: #cccccc;
            border: 1px solid #4a4a4a;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: all 0.2s;
            font-family: inherit;
        }
        
        .html-editor-btn:hover {
            background: #4a4a4a;
            color: #ffffff;
            border-color: #5a5a5a;
        }
        
        .html-editor-btn:active {
            transform: scale(0.95);
        }
        
        .html-editor-btn.close {
            background: #d73a49;
            color: white;
            border-color: #d73a49;
        }
        
        .html-editor-btn.close:hover {
            background: #cb2431;
            border-color: #cb2431;
        }
        
        #html-editor-search {
            background: #2d2d2d;
            padding: 8px 16px;
            border-bottom: 1px solid #3e3e3e;
            display: flex;
            gap: 8px;
            align-items: center;
            flex-shrink: 0;
        }
        
        #html-editor-search-input {
            flex: 1;
            background: #1e1e1e;
            color: #e0e0e0;
            border: 1px solid #3e3e3e;
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 13px;
            font-family: inherit;
        }
        
        #html-editor-search-input:focus {
            outline: none;
            border-color: #007acc;
            box-shadow: 0 0 0 1px #007acc;
        }
        
        #html-editor-search-info {
            color: #969696;
            font-size: 12px;
            min-width: 60px;
            text-align: center;
        }
        
        #html-editor-main {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        #html-editor-content {
            flex: 1;
            overflow-y: auto;
            overflow-x: auto;
            background: #1e1e1e;
            transition: flex 0.3s ease;
        }
        
        #html-editor-code-panel {
            flex: 0;
            background: #252526;
            border-top: 1px solid #3e3e3e;
            overflow: hidden;
            transition: flex 0.3s ease;
        }
        
        #html-editor-code-panel.active {
            flex: 1;
        }
        
        #html-editor-code-header {
            background: #2d2d2d;
            padding: 8px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #3e3e3e;
            color: #e0e0e0;
            font-size: 12px;
        }
        
        #html-editor-code-content {
            height: calc(100% - 40px);
            overflow: auto;
        }
        
        #html-editor-code-editor {
            width: 100%;
            height: 100%;
            background: #1e1e1e;
            color: #d4d4d4;
            border: none;
            padding: 16px;
            font-family: inherit;
            font-size: 13px;
            line-height: 1.4;
            resize: none;
            outline: none;
        }
        
        .tree-node {
            user-select: none;
            color: #d4d4d4;
            font-size: 13px;
            line-height: 22px;
            min-width: max-content;
        }
        
        .tree-node-header {
            display: flex;
            align-items: center;
            padding: 2px 8px;
            cursor: pointer;
            white-space: nowrap;
            min-width: max-content;
        }
        
        .tree-node-header:hover {
            background: #2a2a2a;
        }
        
        .tree-node-header.selected {
            background: #094771;
        }
        
        .tree-node-header.search-highlight {
            background: #515c6a !important;
            border-radius: 2px;
        }
        
        .tree-node-header.current-search {
            background: #007acc !important;
            color: white;
        }
        
        .tree-toggle {
            width: 16px;
            height: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-right: 4px;
            flex-shrink: 0;
        }
        
        .tree-toggle::before {
            content: '▶';
            font-size: 10px;
            transition: transform 0.2s;
        }
        
        .tree-toggle.expanded::before {
            transform: rotate(90deg);
        }
        
        .tree-toggle.empty::before {
            content: '';
        }
        
        .tree-tag {
            color: #569cd6;
        }
        
        .tree-attr-name {
            color: #9cdcfe;
            margin-left: 8px;
        }
        
        .tree-attr-value {
            color: #ce9178;
        }
        
        .tree-text {
            color: #d4d4d4;
            font-style: italic;
        }
        
        .tree-script-content {
            color: #dcdcaa;
            background: rgba(220, 220, 170, 0.1);
            padding: 2px 4px;
            border-radius: 2px;
            margin-left: 8px;
        }
        
        .tree-style-content {
            color: #4ec9b0;
            background: rgba(78, 201, 176, 0.1);
            padding: 2px 4px;
            border-radius: 2px;
            margin-left: 8px;
        }
        
        .tree-children {
            padding-left: 20px;
            display: none;
        }
        
        .tree-children.expanded {
            display: block;
        }
        
        .context-menu {
            position: fixed;
            background: #2d2d2d;
            border: 1px solid #3e3e3e;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.4);
            z-index: 1000000;
            min-width: 140px;
            overflow: hidden;
        }
        
        .context-menu-item {
            padding: 8px 12px;
            color: #d4d4d4;
            cursor: pointer;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .context-menu-item:hover {
            background: #4a4a4a;
        }
        
        .context-menu-item.danger:hover {
            background: #d73a49;
            color: white;
        }
        
        .context-menu-item .icon {
            font-size: 14px;
            width: 14px;
            text-align: center;
        }
        
        @media (max-width: 768px) {
            #html-editor-panel {
                width: 100%;
            }
        }
        
        @media (max-width: 1024px) and (orientation: landscape) {
            #html-editor-panel {
                width: 50%;
            }
        }
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'html-editor-panel';

    const header = document.createElement('div');
    header.id = 'html-editor-header';
    
    const title = document.createElement('div');
    title.id = 'html-editor-title';
    title.textContent = 'HTML Editor';
    
    const controls = document.createElement('div');
    controls.id = 'html-editor-controls';
    
    const applyBtn = document.createElement('button');
    applyBtn.className = 'html-editor-btn';
    applyBtn.textContent = 'Apply';
    applyBtn.onclick = applyChanges;
    
    const refreshBtn = document.createElement('button');
    refreshBtn.className = 'html-editor-btn';
    refreshBtn.textContent = 'Refresh';
    refreshBtn.onclick = refreshHTML;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'html-editor-btn close';
    closeBtn.textContent = '✕';
    closeBtn.onclick = closePanel;
    
    controls.appendChild(applyBtn);
    controls.appendChild(refreshBtn);
    controls.appendChild(closeBtn);
    header.appendChild(title);
    header.appendChild(controls);

    const searchBar = document.createElement('div');
    searchBar.id = 'html-editor-search';
    
    const searchInput = document.createElement('input');
    searchInput.id = 'html-editor-search-input';
    searchInput.type = 'text';
    searchInput.placeholder = 'Search all content (Ctrl+F)';
    
    const searchBtn = document.createElement('button');
    searchBtn.className = 'html-editor-btn';
    searchBtn.textContent = 'Find';
    searchBtn.onclick = performSearch;
    
    const prevBtn = document.createElement('button');
    prevBtn.className = 'html-editor-btn';
    prevBtn.textContent = '↑';
    prevBtn.onclick = () => navigateSearch(-1);
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'html-editor-btn';
    nextBtn.textContent = '↓';
    nextBtn.onclick = () => navigateSearch(1);
    
    const searchInfo = document.createElement('div');
    searchInfo.id = 'html-editor-search-info';
    searchInfo.textContent = '';
    
    searchBar.appendChild(searchInput);
    searchBar.appendChild(searchBtn);
    searchBar.appendChild(prevBtn);
    searchBar.appendChild(nextBtn);
    searchBar.appendChild(searchInfo);

    const main = document.createElement('div');
    main.id = 'html-editor-main';

    const content = document.createElement('div');
    content.id = 'html-editor-content';

    const codePanel = document.createElement('div');
    codePanel.id = 'html-editor-code-panel';
    
    const codeHeader = document.createElement('div');
    codeHeader.id = 'html-editor-code-header';
    
    const codeTitle = document.createElement('span');
    codeTitle.textContent = 'Code Editor';
    
    const codePanelClose = document.createElement('button');
    codePanelClose.className = 'html-editor-btn';
    codePanelClose.textContent = '×';
    codePanelClose.onclick = closeCodePanel;
    
    codeHeader.appendChild(codeTitle);
    codeHeader.appendChild(codePanelClose);
    
    const codeContent = document.createElement('div');
    codeContent.id = 'html-editor-code-content';
    
    const codeEditor = document.createElement('textarea');
    codeEditor.id = 'html-editor-code-editor';
    codeEditor.spellcheck = false;
    
    codeContent.appendChild(codeEditor);
    codePanel.appendChild(codeHeader);
    codePanel.appendChild(codeContent);

    main.appendChild(content);
    main.appendChild(codePanel);
    panel.appendChild(header);
    panel.appendChild(searchBar);
    panel.appendChild(main);
    document.body.appendChild(panel);

    let searchResults = [];
    let currentSearchIndex = 0;
    let currentEditingElement = null;
    let nodeMap = new Map();
    let elementToNodeMap = new Map();
    let longPressTimer = null;
    let contextMenu = null;

    // 全てのテキストコンテンツを抽出する関数
    function extractAllTextContent(element) {
        const textSources = [];
        
        // 要素のタグ名と属性
        const tagInfo = {
            type: 'tag',
            element: element,
            text: element.tagName.toLowerCase(),
            searchableText: element.tagName.toLowerCase()
        };
        
        // 属性の値も検索対象に含める
        for (let attr of element.attributes) {
            tagInfo.searchableText += ` ${attr.name}="${attr.value}"`;
        }
        textSources.push(tagInfo);
        
        // script要素の中身
        if (element.tagName.toLowerCase() === 'script') {
            const scriptContent = element.textContent || element.innerHTML;
            if (scriptContent.trim()) {
                textSources.push({
                    type: 'script',
                    element: element,
                    text: scriptContent.trim(),
                    searchableText: scriptContent.trim()
                });
            }
        }
        
        // style要素の中身
        if (element.tagName.toLowerCase() === 'style') {
            const styleContent = element.textContent || element.innerHTML;
            if (styleContent.trim()) {
                textSources.push({
                    type: 'style',
                    element: element,
                    text: styleContent.trim(),
                    searchableText: styleContent.trim()
                });
            }
        }
        
        // テキストノード
        for (let child of element.childNodes) {
            if (child.nodeType === 3) { // TEXT_NODE
                const text = child.textContent.trim();
                if (text) {
                    textSources.push({
                        type: 'text',
                        element: element,
                        textNode: child,
                        text: text,
                        searchableText: text
                    });
                }
            }
        }
        
        return textSources;
    }

    // 要素までのパスを展開する関数
    function expandPathToElement(targetElement) {
        const path = [];
        let current = targetElement;
        
        // ルートまでのパスを取得
        while (current && current !== document.documentElement.parentNode) {
            path.unshift(current);
            current = current.parentElement;
        }
        
        // パス上の各要素に対応するノードを展開
        for (let element of path) {
            const treeNode = elementToNodeMap.get(element);
            if (treeNode) {
                const header = treeNode.querySelector('.tree-node-header');
                const toggle = header?.querySelector('.tree-toggle');
                const childrenDiv = treeNode.querySelector('.tree-children');
                
                if (toggle && childrenDiv && !toggle.classList.contains('expanded')) {
                    toggle.classList.add('expanded');
                    childrenDiv.classList.add('expanded');
                }
            }
        }
    }

    function parseDOM(element, depth = 0) {
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'tree-node';
        nodeDiv.style.paddingLeft = depth * 20 + 'px';
        
        // 要素とノードの対応を保存
        elementToNodeMap.set(element, nodeDiv);
        
        const header = document.createElement('div');
        header.className = 'tree-node-header';
        header.dataset.elementId = Math.random().toString(36).substr(2, 9);
        
        const toggle = document.createElement('span');
        toggle.className = 'tree-toggle';
        
        const hasChildren = element.children.length > 0 || 
                          (element.childNodes.length > 0 && 
                           Array.from(element.childNodes).some(n => n.nodeType === 3 && n.textContent.trim()));
        
        if (!hasChildren) {
            toggle.className += ' empty';
        }
        
        const tagSpan = document.createElement('span');
        tagSpan.className = 'tree-tag';
        tagSpan.textContent = '<' + element.tagName.toLowerCase();
        
        const attrs = [];
        for (let attr of element.attributes) {
            attrs.push(`<span class="tree-attr-name">${attr.name}</span>=<span class="tree-attr-value">"${attr.value}"</span>`);
        }
        
        const attrSpan = document.createElement('span');
        attrSpan.innerHTML = attrs.join('');
        
        const tagEnd = document.createElement('span');
        tagEnd.className = 'tree-tag';
        tagEnd.textContent = '>';
        
        header.appendChild(toggle);
        header.appendChild(tagSpan);
        header.appendChild(attrSpan);
        header.appendChild(tagEnd);
        
        // スクリプトやスタイルの内容を表示
        if (element.tagName.toLowerCase() === 'script') {
            const scriptContent = element.textContent || element.innerHTML;
            if (scriptContent.trim()) {
                const scriptSpan = document.createElement('span');
                scriptSpan.className = 'tree-script-content';
                scriptSpan.textContent = scriptContent.substring(0, 100) + (scriptContent.length > 100 ? '...' : '');
                header.appendChild(scriptSpan);
            }
        }
        
        if (element.tagName.toLowerCase() === 'style') {
            const styleContent = element.textContent || element.innerHTML;
            if (styleContent.trim()) {
                const styleSpan = document.createElement('span');
                styleSpan.className = 'tree-style-content';
                styleSpan.textContent = styleContent.substring(0, 100) + (styleContent.length > 100 ? '...' : '');
                header.appendChild(styleSpan);
            }
        }
        
        const childrenDiv = document.createElement('div');
        childrenDiv.className = 'tree-children';
        
        if (hasChildren) {
            // テキストノードを表示
            const textContent = Array.from(element.childNodes)
                .filter(n => n.nodeType === 3)
                .map(n => n.textContent.trim())
                .filter(t => t)
                .join(' ');
            
            if (textContent) {
                const textNode = document.createElement('div');
                textNode.className = 'tree-node';
                textNode.style.paddingLeft = (depth + 1) * 20 + 'px';
                const textSpan = document.createElement('span');
                textSpan.className = 'tree-text';
                textSpan.textContent = textContent.substring(0, 200) + (textContent.length > 200 ? '...' : '');
                textNode.appendChild(textSpan);
                childrenDiv.appendChild(textNode);
            }
            
            // 子要素を処理
            for (let child of element.children) {
                childrenDiv.appendChild(parseDOM(child, depth + 1));
            }
        }
        
        nodeDiv.appendChild(header);
        nodeDiv.appendChild(childrenDiv);
        
        nodeMap.set(nodeDiv, element);
        
        // クリックイベント
        header.onclick = (e) => {
            e.stopPropagation();
            
            if (e.target === toggle || e.target === header) {
                if (hasChildren) {
                    toggle.classList.toggle('expanded');
                    childrenDiv.classList.toggle('expanded');
                }
            }
            
            document.querySelectorAll('.tree-node-header.selected').forEach(h => {
                h.classList.remove('selected');
            });
            header.classList.add('selected');
        };

        // 右クリックイベント
        header.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e, element);
        });

        header.addEventListener('touchstart', (e) => {
            longPressTimer = setTimeout(() => {
                showContextMenu(e.touches[0], element);
            }, 500);
        });

        header.addEventListener('touchend', (e) => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        });

        header.addEventListener('touchmove', (e) => {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        });
        
        return nodeDiv;
    }

    function showContextMenu(event, element) {
        closeContextMenu();
        
        contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        
        const editItem = document.createElement('div');
        editItem.className = 'context-menu-item';
        editItem.innerHTML = '<span class="icon">✏️</span>Edit Code';
        editItem.onclick = () => {
            editElementCode(element);
            closeContextMenu();
        };
        
        const removeItem = document.createElement('div');
        removeItem.className = 'context-menu-item danger';
        removeItem.innerHTML = '<span class="icon">🗑️</span>Remove Element';
        removeItem.onclick = () => {
            removeElement(element);
            closeContextMenu();
        };
        
        const copyItem = document.createElement('div');
        copyItem.className = 'context-menu-item';
        copyItem.innerHTML = '<span class="icon">📋</span>Copy HTML';
        copyItem.onclick = () => {
            copyElementHTML(element);
            closeContextMenu();
        };
        
        contextMenu.appendChild(editItem);
        contextMenu.appendChild(removeItem);
        contextMenu.appendChild(copyItem);
        
        document.body.appendChild(contextMenu);
        
        const x = event.clientX || event.pageX;
        const y = event.clientY || event.pageY;
        
        contextMenu.style.left = x + 'px';
        contextMenu.style.top = y + 'px';
        
        const rect = contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            contextMenu.style.left = (x - rect.width) + 'px';
        }
        if (rect.bottom > window.innerHeight) {
            contextMenu.style.top = (y - rect.height) + 'px';
        }
    }

    function closeContextMenu() {
        if (contextMenu) {
            contextMenu.remove();
            contextMenu = null;
        }
    }

    function editElementCode(element) {
        currentEditingElement = element;
        codeEditor.value = element.outerHTML;
        codePanel.classList.add('active');
        content.style.flex = '1';
        codeTitle.textContent = `Code Editor - <${element.tagName.toLowerCase()}>`;
    }

    function closeCodePanel() {
        codePanel.classList.remove('active');
        content.style.flex = '1';
        currentEditingElement = null;
    }

    function removeElement(element) {
        if (element === document.documentElement || element === document.body) {
            alert('Cannot remove html or body element');
            return;
        }
        
        if (confirm(`Remove <${element.tagName.toLowerCase()}> element?`)) {
            element.remove();
            buildTree();
        }
    }

    function copyElementHTML(element) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(element.outerHTML).then(() => {
                const originalText = codeTitle.textContent;
                codeTitle.textContent = 'HTML copied to clipboard!';
                setTimeout(() => {
                    codeTitle.textContent = originalText;
                }, 2000);
            });
        }
    }

    function buildTree() {
        content.innerHTML = '';
        nodeMap.clear();
        elementToNodeMap.clear();
        const tree = parseDOM(document.documentElement);
        content.appendChild(tree);
    }

    // 改良された検索機能
    function performSearch() {
        const query = searchInput.value.toLowerCase();
        if (!query) {
            clearSearchHighlights();
            searchResults = [];
            searchInfo.textContent = '';
            return;
        }

        clearSearchHighlights();
        searchResults = [];

        // 全ての要素を走査してテキストコンテンツを検索
        function searchInElement(element) {
            const textSources = extractAllTextContent(element);
            
            for (let source of textSources) {
                if (source.searchableText.toLowerCase().includes(query)) {
                    const treeNode = elementToNodeMap.get(source.element);
                    if (treeNode) {
                        const header = treeNode.querySelector('.tree-node-header');
                        if (header && !searchResults.find(r => r.header === header)) {
                            searchResults.push({
                                header: header,
                                element: source.element,
                                textSource: source
                            });
                            header.classList.add('search-highlight');
                        }
                    }
                }
            }
            
            // 子要素も検索
            for (let child of element.children) {
                searchInElement(child);
            }
        }

        searchInElement(document.documentElement);
        
        if (searchResults.length > 0) {
            currentSearchIndex = 0;
            jumpToResult(0);
        }
        
        updateSearchInfo();
    }

    function clearSearchHighlights() {
        document.querySelectorAll('.search-highlight, .current-search').forEach(el => {
            el.classList.remove('search-highlight', 'current-search');
        });
    }

    function navigateSearch(direction) {
        if (searchResults.length === 0) return;
        
        // 現在のハイライトを削除
        if (searchResults[currentSearchIndex]) {
            searchResults[currentSearchIndex].header.classList.remove('current-search');
        }
        
        currentSearchIndex += direction;
        if (currentSearchIndex < 0) {
            currentSearchIndex = searchResults.length - 1;
        } else if (currentSearchIndex >= searchResults.length) {
            currentSearchIndex = 0;
        }
        
        jumpToResult(currentSearchIndex);
        updateSearchInfo();
    }

    function jumpToResult(index) {
        if (searchResults.length === 0 || !searchResults[index]) return;
        
        const result = searchResults[index];
        
        // 前の選択を解除
        document.querySelectorAll('.current-search').forEach(el => {
            el.classList.remove('current-search');
        });
        
        // 要素までのパスを展開
        expandPathToElement(result.element);
        
        // ハイライト
        result.header.classList.add('current-search');
        
        // スクロールしてビューに表示
        setTimeout(() => {
            result.header.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center',
                inline: 'nearest'
            });
        }, 100);
        
        // 選択状態にする
        document.querySelectorAll('.tree-node-header.selected').forEach(h => {
            h.classList.remove('selected');
        });
        result.header.classList.add('selected');
    }

    function updateSearchInfo() {
        if (searchResults.length === 0) {
            searchInfo.textContent = searchInput.value ? 'No results' : '';
        } else {
            searchInfo.textContent = `${currentSearchIndex + 1}/${searchResults.length}`;
        }
    }

    function applyChanges() {
        if (currentEditingElement && codeEditor.value.trim()) {
            try {
                const temp = document.createElement('div');
                temp.innerHTML = codeEditor.value;
                if (temp.firstElementChild) {
                    currentEditingElement.outerHTML = temp.firstElementChild.outerHTML;
                    closeCodePanel();
                    buildTree();
                    return;
                }
            } catch(e) {
                alert('Invalid HTML code');
                return;
            }
        }
        
        const newHTML = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
        document.open();
        document.write(newHTML);
        document.close();
        
        setTimeout(() => {
            document.body.appendChild(panel);
            document.head.appendChild(style);
            buildTree();
        }, 100);
    }

    function refreshHTML() {
        buildTree();
    }

    function closePanel() {
        closeContextMenu();
        panel.remove();
        style.remove();
    }

    // イベントリスナー
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (searchResults.length > 0) {
                if (e.shiftKey) {
                    navigateSearch(-1);
                } else {
                    navigateSearch(1);
                }
            } else {
                performSearch();
            }
        }
    });

    searchInput.addEventListener('input', () => {
        if (searchInput.value.trim()) {
            performSearch();
        } else {
            clearSearchHighlights();
            searchResults = [];
            updateSearchInfo();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
        
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            applyChanges();
        }
        
        if (e.key === 'Escape') {
            if (codePanel.classList.contains('active')) {
                closeCodePanel();
            } else {
                closePanel();
            }
        }
    });

    document.addEventListener('click', (e) => {
        if (contextMenu && !contextMenu.contains(e.target)) {
            closeContextMenu();
        }
    });

    codeEditor.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            applyChanges();
        }
        
        if (e.key === 'Escape') {
            closeCodePanel();
        }
    });

    buildTree();
})();
