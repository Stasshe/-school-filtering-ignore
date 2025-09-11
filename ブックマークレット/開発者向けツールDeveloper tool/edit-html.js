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
        
        #html-editor-content {
            flex: 1;
            overflow-y: auto;
            overflow-x: hidden;
            background: #1e1e1e;
        }
        
        .tree-node {
            user-select: none;
            color: #d4d4d4;
            font-size: 13px;
            line-height: 22px;
        }
        
        .tree-node-header {
            display: flex;
            align-items: center;
            padding: 2px 8px;
            cursor: pointer;
            white-space: nowrap;
        }
        
        .tree-node-header:hover {
            background: #2a2a2a;
        }
        
        .tree-node-header.selected {
            background: #094771;
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
        
        .tree-children {
            padding-left: 20px;
            display: none;
        }
        
        .tree-children.expanded {
            display: block;
        }
        
        .tree-editor {
            width: 100%;
            background: #252526;
            color: #d4d4d4;
            border: 1px solid #3e3e3e;
            padding: 8px;
            font-family: inherit;
            font-size: 13px;
            resize: vertical;
            min-height: 60px;
            margin: 4px 0;
            display: none;
        }
        
        .tree-editor.active {
            display: block;
        }
        
        .tree-editor:focus {
            outline: none;
            border-color: #007acc;
        }
        
        .highlight-result {
            background: #515c6a !important;
            border-radius: 2px;
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
    searchInput.placeholder = 'Search (Ctrl+F)';
    
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

    const content = document.createElement('div');
    content.id = 'html-editor-content';

    panel.appendChild(header);
    panel.appendChild(searchBar);
    panel.appendChild(content);
    document.body.appendChild(panel);

    let searchResults = [];
    let currentSearchIndex = 0;
    let currentEditingNode = null;
    let nodeMap = new Map();

    function parseDOM(element, depth = 0) {
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'tree-node';
        nodeDiv.style.paddingLeft = depth * 20 + 'px';
        
        const header = document.createElement('div');
        header.className = 'tree-node-header';
        
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
        
        const editor = document.createElement('textarea');
        editor.className = 'tree-editor';
        editor.value = element.outerHTML;
        editor.spellcheck = false;
        
        const childrenDiv = document.createElement('div');
        childrenDiv.className = 'tree-children';
        
        if (hasChildren) {
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
                textSpan.textContent = textContent.substring(0, 50) + (textContent.length > 50 ? '...' : '');
                textNode.appendChild(textSpan);
                childrenDiv.appendChild(textNode);
            }
            
            for (let child of element.children) {
                childrenDiv.appendChild(parseDOM(child, depth + 1));
            }
        }
        
        nodeDiv.appendChild(header);
        nodeDiv.appendChild(editor);
        nodeDiv.appendChild(childrenDiv);
        
        nodeMap.set(nodeDiv, element);
        
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
            
            document.querySelectorAll('.tree-editor.active').forEach(ed => {
                ed.classList.remove('active');
            });
            editor.classList.add('active');
            
            currentEditingNode = {
                element: element,
                editor: editor
            };
        };
        
        editor.oninput = () => {
            if (currentEditingNode && currentEditingNode.editor === editor) {
                try {
                    const temp = document.createElement('div');
                    temp.innerHTML = editor.value;
                    if (temp.firstElementChild) {
                        nodeMap.set(nodeDiv, temp.firstElementChild);
                    }
                } catch(e) {}
            }
        };
        
        return nodeDiv;
    }

    function buildTree() {
        content.innerHTML = '';
        nodeMap.clear();
        const tree = parseDOM(document.documentElement);
        content.appendChild(tree);
    }

    function performSearch() {
        const query = searchInput.value.toLowerCase();
        if (!query) {
            document.querySelectorAll('.highlight-result').forEach(el => {
                el.classList.remove('highlight-result');
            });
            searchResults = [];
            searchInfo.textContent = '';
            return;
        }

        searchResults = [];
        document.querySelectorAll('.highlight-result').forEach(el => {
            el.classList.remove('highlight-result');
        });

        document.querySelectorAll('.tree-node-header').forEach(header => {
            if (header.textContent.toLowerCase().includes(query)) {
                searchResults.push(header);
                header.classList.add('highlight-result');
            }
        });
        
        if (searchResults.length > 0) {
            currentSearchIndex = 0;
            jumpToResult(0);
        }
        
        updateSearchInfo();
    }

    function navigateSearch(direction) {
        if (searchResults.length === 0) return;
        
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
        if (searchResults.length === 0) return;
        
        const result = searchResults[index];
        result.scrollIntoView({ behavior: 'smooth', block: 'center' });
        result.click();
    }

    function updateSearchInfo() {
        if (searchResults.length === 0) {
            searchInfo.textContent = searchInput.value ? 'No results' : '';
        } else {
            searchInfo.textContent = `${currentSearchIndex + 1}/${searchResults.length}`;
        }
    }

    function applyChanges() {
        const newHTML = reconstructHTML();
        document.open();
        document.write(newHTML);
        document.close();
        
        setTimeout(() => {
            document.body.appendChild(panel);
            document.head.appendChild(style);
            buildTree();
        }, 100);
    }

    function reconstructHTML() {
        const root = nodeMap.get(content.firstChild);
        if (root) {
            return '<!DOCTYPE html>\n' + root.outerHTML;
        }
        return document.documentElement.outerHTML;
    }

    function refreshHTML() {
        buildTree();
    }

    function closePanel() {
        panel.remove();
        style.remove();
    }

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
            closePanel();
        }
    });

    buildTree();
})();
