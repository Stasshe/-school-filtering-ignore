(function () {
  const existingPanel = document.getElementById('html-editor-panel');
  if (existingPanel) {
    existingPanel.remove();
    return;
  }

  // Inspector Mode Feature - Added at the top
  let inspectorMode = false;
  let hoveredElement = null;
  let selectedInspectorElement = null;
  const inspectorOverlay = document.createElement('div');
  inspectorOverlay.style.cssText = `
    position: fixed;
    pointer-events: none;
    border: 2px solid #007acc;
    background: rgba(0, 122, 204, 0.1);
    z-index: 999998;
    display: none;
    transition: all 0.1s ease;
  `;
  document.body.appendChild(inspectorOverlay);

  const inspectorLabel = document.createElement('div');
  inspectorLabel.style.cssText = `
    position: fixed;
    background: #007acc;
    color: white;
    padding: 4px 8px;
    font-size: 11px;
    font-family: monospace;
    border-radius: 3px;
    z-index: 999998;
    display: none;
    pointer-events: none;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  `;
  document.body.appendChild(inspectorLabel);

  // ショートカットキーのイベントリスナーを追加
  document.addEventListener('keydown', function (e) {
    // Ctrl + Shift + I (Windows/Linux) または Cmd + Shift + I (Mac) でインスペクターモードを切り替え
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      toggleInspectorMode();
    }

    // Escapeキーでインスペクターモードを解除
    if (e.key === 'Escape' && inspectorMode) {
      e.preventDefault();
      disableInspectorMode();
    }
  });

  function toggleInspectorMode() {
    if (inspectorMode) {
      disableInspectorMode();
    } else {
      enableInspectorMode();
    }
  }

  function enableInspectorMode() {
    inspectorMode = true;
    document.body.style.cursor = 'crosshair';

    // インスペクターモード開始の視覚的フィードバック
    showInspectorNotification('インスペクターモード ON（Escape で解除）');

    // Add event listeners for inspector
    document.addEventListener('mousemove', inspectorMouseMove, true);
    document.addEventListener('click', inspectorClick, true);
    document.addEventListener('mouseout', inspectorMouseOut, true);
  }

  function disableInspectorMode() {
    inspectorMode = false;
    document.body.style.cursor = '';
    inspectorOverlay.style.display = 'none';
    inspectorLabel.style.display = 'none';

    // インスペクターモード終了の視覚的フィードバック
    showInspectorNotification('インスペクターモード OFF');

    // Remove event listeners
    document.removeEventListener('mousemove', inspectorMouseMove, true);
    document.removeEventListener('click', inspectorClick, true);
    document.removeEventListener('mouseout', inspectorMouseOut, true);

    // Clear selected element highlight
    if (selectedInspectorElement) {
      selectedInspectorElement.style.outline = '';
      selectedInspectorElement = null;
    }
  }

  function showInspectorNotification(message) {
    // 通知用の要素を作成
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: #007acc;
      color: white;
      padding: 12px 16px;
      font-size: 14px;
      font-family: system-ui, -apple-system, sans-serif;
      border-radius: 6px;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      opacity: 0;
      transform: translateY(-20px);
      transition: all 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    // フェードイン
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateY(0)';
    }, 10);

    // 2秒後にフェードアウト
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateY(-20px)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 2000);
  }

  function inspectorMouseMove(e) {
    if (!inspectorMode) return;

    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (!element || element === inspectorOverlay || element === inspectorLabel ||
      element.closest('#html-editor-panel') || element.closest('#html-editor-float-overlay')) {
      return;
    }

    if (element !== hoveredElement) {
      hoveredElement = element;
      highlightElement(element, e);
    }
  }

  function inspectorClick(e) {
    if (!inspectorMode) return;

    e.preventDefault();
    e.stopPropagation();

    const element = document.elementFromPoint(e.clientX, e.clientY);
    if (!element || element === inspectorOverlay || element === inspectorLabel ||
      element.closest('#html-editor-panel') || element.closest('#html-editor-float-overlay')) {
      return;
    }

    // Clear previous selection
    if (selectedInspectorElement && selectedInspectorElement !== element) {
      selectedInspectorElement.style.outline = '';
    }

    // Highlight selected element
    selectedInspectorElement = element;
    element.style.outline = '2px dashed #ff6b6b';

    // Find and jump to element in tree
    jumpToElementInTree(element);

    // 要素を選択したらインスペクターモードを自動で解除
    setTimeout(() => {
      disableInspectorMode();
    }, 100); // 少し遅延を入れてアニメーションが完了してから
  }

  function inspectorMouseOut(e) {
    if (!inspectorMode) return;
    inspectorOverlay.style.display = 'none';
    inspectorLabel.style.display = 'none';
    hoveredElement = null;
  }

  function highlightElement(element, event) {
    const rect = element.getBoundingClientRect();

    // Update overlay position
    inspectorOverlay.style.display = 'block';
    inspectorOverlay.style.left = rect.left + 'px';
    inspectorOverlay.style.top = rect.top + 'px';
    inspectorOverlay.style.width = rect.width + 'px';
    inspectorOverlay.style.height = rect.height + 'px';

    // Update label
    const tagName = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const classes = element.className ? `.${element.className.split(' ').filter(c => c).join('.')}` : '';
    const dimensions = `${Math.round(rect.width)}×${Math.round(rect.height)}`;

    inspectorLabel.textContent = `${tagName}${id}${classes} [${dimensions}]`;
    inspectorLabel.style.display = 'block';

    // Position label
    let labelX = event.clientX + 10;
    let labelY = event.clientY + 20;

    // Adjust if label would go off screen
    const labelRect = inspectorLabel.getBoundingClientRect();
    if (labelX + labelRect.width > window.innerWidth) {
      labelX = event.clientX - labelRect.width - 10;
    }
    if (labelY + labelRect.height > window.innerHeight) {
      labelY = event.clientY - labelRect.height - 10;
    }

    inspectorLabel.style.left = labelX + 'px';
    inspectorLabel.style.top = labelY + 'px';
  }

  function jumpToElementInTree(targetElement) {
    // Expand path to element
    expandPathToElement(targetElement);

    // Find and highlight the tree node
    const treeNode = elementToNodeMap.get(targetElement);
    if (treeNode) {
      const header = treeNode.querySelector('.tree-node-header');
      if (header) {
        // Clear previous selections
        document.querySelectorAll('.tree-node-header.selected').forEach(h => {
          h.classList.remove('selected');
        });
        document.querySelectorAll('.tree-node-header.inspector-selected').forEach(h => {
          h.classList.remove('inspector-selected');
        });

        // Add selection classes
        header.classList.add('selected', 'inspector-selected');

        // Scroll to element
        header.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });

        // Add temporary highlight effect
        header.style.transition = 'background-color 0.3s ease';
        header.style.backgroundColor = '#ff6b6b';
        setTimeout(() => {
          header.style.backgroundColor = '';
        }, 500);
      }
    }
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
            padding: 10px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #3e3e3e;
            flex-shrink: 0;
            gap: 12px;
        }
        
        #html-editor-title {
            color: #e0e0e0;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.3px;
            flex-shrink: 0;
        }
        
        #html-editor-controls {
            display: flex;
            gap: 6px;
            flex-shrink: 0;
        }
        
        .html-editor-btn {
            background: #3c3c3c;
            color: #cccccc;
            border: 1px solid #4a4a4a;
            padding: 4px 8px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 10px;
            transition: all 0.2s;
            font-family: inherit;
            min-width: auto;
            white-space: nowrap;
        }
        
        .html-editor-btn:hover {
            background: #4a4a4a;
            color: #ffffff;
            border-color: #5a5a5a;
        }
        
        .html-editor-btn:active {
            transform: scale(0.95);
        }
        
        .html-editor-btn.active {
            background: #007acc;
            color: white;
            border-color: #007acc;
        }
        
        .html-editor-btn.active:hover {
            background: #005a9e;
            border-color: #005a9e;
        }
        
        .html-editor-btn.close {
            background: #d73a49;
            color: white;
            border-color: #d73a49;
            padding: 4px 6px;
        }
        
        .html-editor-btn.close:hover {
            background: #cb2431;
            border-color: #cb2431;
        }
        
        #html-editor-search {
            background: #2d2d2d;
            padding: 6px 12px;
            border-bottom: 1px solid #3e3e3e;
            display: flex;
            gap: 6px;
            align-items: center;
            flex-shrink: 0;
        }
        
        #html-editor-search-input {
            flex: 1;
            background: #1e1e1e;
            color: #e0e0e0;
            border: 1px solid #3e3e3e;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 11px;
            font-family: inherit;
            min-width: 0;
        }
        
        #html-editor-search-input:focus {
            outline: none;
            border-color: #007acc;
            box-shadow: 0 0 0 1px #007acc;
        }
        
        #html-editor-search-info {
            color: #969696;
            font-size: 10px;
            min-width: 50px;
            text-align: center;
            flex-shrink: 0;
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
        }
        
        #html-editor-float-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 1000000;
            display: none;
            align-items: center;
            justify-content: center;
        }
        
        #html-editor-float-window {
            background: #1e1e1e;
            border: 1px solid #3e3e3e;
            border-radius: 8px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
            width: 80%;
            height: 80%;
            max-width: 1200px;
            max-height: 800px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        #html-editor-float-header {
            background: #2d2d2d;
            padding: 12px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #3e3e3e;
            cursor: move;
        }
        
        #html-editor-float-title {
            color: #e0e0e0;
            font-size: 13px;
            font-weight: 600;
        }
        
        #html-editor-float-controls {
            display: flex;
            gap: 8px;
        }
        
        #html-editor-float-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        #html-editor-float-editor {
            flex: 1;
            background: #1e1e1e;
            color: #d4d4d4;
            border: none;
            padding: 16px;
            font-family: inherit;
            font-size: 12px;
            line-height: 1.4;
            resize: none;
            outline: none;
            overflow: auto;
        }
        
    .tree-node,
    .tree-node *,
    .tree-node-header,
    .tree-node-header *,
    .tree-children,
    .tree-children *,
    .tree-text,
    .tree-script-content,
    .tree-style-content {
      user-select: none !important;
      -webkit-user-select: none !important;
      -ms-user-select: none !important;
      -moz-user-select: none !important;
    }
    .tree-node {
      color: #d4d4d4;
      font-size: 11px;
      line-height: 18px;
      min-width: max-content;
    }
        
    .tree-node-header {
      display: flex;
      align-items: center;
      padding: 1px 6px;
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
        
        .tree-node-header.inspector-selected {
            background: #6b1f1f !important;
        }
        
        .tree-node-header.search-highlight {
            background: #515c6a !important;
            border-radius: 2px;
        }
        
        .tree-node-header.current-search {
            background: #007acc !important;
            outline: 1px solid #fff;
            color: white;
        }
        
        .tree-toggle {
            width: 12px;
            height: 12px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-right: 3px;
            flex-shrink: 0;
        }
        
        .tree-toggle::before {
            content: '▶';
            font-size: 8px;
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
            margin-left: 6px;
        }
        
        .tree-attr-value {
            color: #ce9178;
        }
        
        .tree-text {
            user-select: none;
            color: #d4d4d4;
            font-style: italic;
        }
        
        .tree-script-content {
            user-select: none;
            color: #dcdcaa;
            background: rgba(220, 220, 170, 0.1);
            padding: 1px 3px;
            border-radius: 2px;
            margin-left: 6px;
        }
        
        .tree-style-content {
            user-select: none;
            color: #4ec9b0;
            background: rgba(78, 201, 176, 0.1);
            padding: 1px 3px;
            border-radius: 2px;
            margin-left: 6px;
        }
        
        .tree-children {
            user-select: none;
            padding-left: 16px;
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
            min-width: 120px;
            overflow: hidden;
        }
        
        .context-menu-item {
            padding: 6px 10px;
            color: #d4d4d4;
            cursor: pointer;
            font-size: 11px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .context-menu-item:hover {
            background: #4a4a4a;
        }
        
        .context-menu-item.danger:hover {
            background: #d73a49;
            color: white;
        }
        
        .context-menu-item .icon {
            font-size: 12px;
            width: 12px;
            text-align: center;
        }
        
        @media (max-width: 768px) {
            #html-editor-panel {
                width: 100%;
            }
            #html-editor-float-window {
                width: 95%;
                height: 90%;
            }
        }
        
        @media (max-width: 1024px) and (orientation: landscape) {
            #html-editor-panel {
                width: 50%;
            }
        }

        .html-editor-tree-highlight {
          outline: 2px solid #ff9800 !important;
          outline-offset: 0px !important;
          transition: outline 0.2s;
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

  const inspectBtn = document.createElement('button');
  inspectBtn.className = 'html-editor-btn';
  inspectBtn.textContent = '🔍';
  inspectBtn.title = 'Toggle Inspector Mode';
  inspectBtn.onclick = () => {
    if (inspectorMode) {
      disableInspectorMode();
      inspectBtn.classList.remove('active');
    } else {
      enableInspectorMode();
      inspectBtn.classList.add('active');
    }
  };

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

  controls.appendChild(inspectBtn);
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

  const floatOverlay = document.createElement('div');
  floatOverlay.id = 'html-editor-float-overlay';

  const floatWindow = document.createElement('div');
  floatWindow.id = 'html-editor-float-window';

  const floatHeader = document.createElement('div');
  floatHeader.id = 'html-editor-float-header';

  const floatTitle = document.createElement('div');
  floatTitle.id = 'html-editor-float-title';
  floatTitle.textContent = 'Code Editor';

  const floatControls = document.createElement('div');
  floatControls.id = 'html-editor-float-controls';

  const saveBtn = document.createElement('button');
  saveBtn.className = 'html-editor-btn';
  saveBtn.textContent = 'Save';
  saveBtn.onclick = saveFloatChanges;

  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'html-editor-btn close';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = closeFloatWindow;

  floatControls.appendChild(saveBtn);
  floatControls.appendChild(cancelBtn);
  floatHeader.appendChild(floatTitle);
  floatHeader.appendChild(floatControls);

  const floatContent = document.createElement('div');
  floatContent.id = 'html-editor-float-content';

  const floatEditor = document.createElement('textarea');
  floatEditor.id = 'html-editor-float-editor';
  floatEditor.spellcheck = false;

  floatContent.appendChild(floatEditor);
  floatWindow.appendChild(floatHeader);
  floatWindow.appendChild(floatContent);
  floatOverlay.appendChild(floatWindow);

  main.appendChild(content);
  panel.appendChild(header);
  panel.appendChild(searchBar);
  panel.appendChild(main);
  document.body.appendChild(panel);
  document.body.appendChild(floatOverlay);

  let searchResults = [];
  let currentSearchIndex = 0;
  let currentEditingElement = null;
  let nodeMap = new Map();
  let elementToNodeMap = new Map();
  let longPressTimer = null;
  let contextMenu = null;
  let codeEditor = null;
  let codePanel = null;

  function closeCodePanel() {
    closeCodeEditor();
  }

  function extractAllTextContent(element) {
    const textSources = [];

    const tagInfo = {
      type: 'tag',
      element: element,
      text: element.tagName.toLowerCase(),
      searchableText: element.tagName.toLowerCase()
    };

    for (let attr of element.attributes) {
      tagInfo.searchableText += ` ${attr.name}="${attr.value}"`;
    }
    textSources.push(tagInfo);

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

    for (let child of element.childNodes) {
      if (child.nodeType === 3) {
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

  function expandPathToElement(targetElement) {
    const path = [];
    let current = targetElement;

    while (current && current !== document.documentElement.parentNode) {
      path.unshift(current);
      current = current.parentElement;
    }

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
    nodeDiv.style.paddingLeft = depth * 16 + 'px';

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

    if (element.tagName.toLowerCase() === 'script') {
      const scriptContent = element.textContent || element.innerHTML;
      if (scriptContent.trim()) {
        const scriptSpan = document.createElement('span');
        scriptSpan.className = 'tree-script-content';
        scriptSpan.textContent = scriptContent.substring(0, 80) + (scriptContent.length > 80 ? '...' : '');
        header.appendChild(scriptSpan);
      }
    }

    if (element.tagName.toLowerCase() === 'style') {
      const styleContent = element.textContent || element.innerHTML;
      if (styleContent.trim()) {
        const styleSpan = document.createElement('span');
        styleSpan.className = 'tree-style-content';
        styleSpan.textContent = styleContent.substring(0, 80) + (styleContent.length > 80 ? '...' : '');
        header.appendChild(styleSpan);
      }
    }

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
        textNode.style.paddingLeft = (depth + 1) * 16 + 'px';
        const textSpan = document.createElement('span');
        textSpan.className = 'tree-text';
        textSpan.textContent = textContent.substring(0, 150) + (textContent.length > 150 ? '...' : '');
        textNode.appendChild(textSpan);
        childrenDiv.appendChild(textNode);
      }

      for (let child of element.children) {
        childrenDiv.appendChild(parseDOM(child, depth + 1));
      }
    }

    nodeDiv.appendChild(header);
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

      // 既存の選択状態を解除
      document.querySelectorAll('.tree-node-header.selected').forEach(h => {
        h.classList.remove('selected');
      });
      header.classList.add('selected');

      // --- ここから枠線ハイライト処理 ---
      // 既存の枠線を消す
      document.querySelectorAll('.html-editor-tree-highlight').forEach(el => {
        el.classList.remove('html-editor-tree-highlight');
        el.style.outline = '';
      });
      // 新たに選択した要素に枠線を付与
      const selectedElement = nodeMap.get(nodeDiv);
      if (selectedElement && selectedElement !== document.documentElement && selectedElement !== document.body) {
        selectedElement.classList.add('html-editor-tree-highlight');
        selectedElement.style.outline = '2px solid #ff9800';
      }
    };

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
    floatEditor.value = element.outerHTML;
    floatTitle.textContent = `Code Editor - <${element.tagName.toLowerCase()}>`;
    floatOverlay.style.display = 'flex';
    floatEditor.focus();
  }

  function closeFloatWindow() {
    floatOverlay.style.display = 'none';
    currentEditingElement = null;
  }

  function saveFloatChanges() {
    if (currentEditingElement && floatEditor.value.trim()) {
      try {
        const temp = document.createElement('div');
        temp.innerHTML = floatEditor.value;
        if (temp.firstElementChild) {
          currentEditingElement.outerHTML = temp.firstElementChild.outerHTML;
          closeFloatWindow();
          buildTree();
          return;
        }
      } catch (e) {
        alert('Invalid HTML code');
        return;
      }
    }
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
        const originalText = title.textContent;
        title.textContent = 'HTML copied to clipboard!';
        setTimeout(() => {
          title.textContent = originalText;
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

    document.querySelectorAll('.current-search').forEach(el => {
      el.classList.remove('current-search');
    });

    expandPathToElement(result.element);

    result.header.classList.add('current-search');

    const container = content;
    const targetRect = result.header.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    if (targetRect.top < containerRect.top || targetRect.bottom > containerRect.bottom) {
      result.header.scrollIntoView({
        behavior: 'auto',
        block: 'center',
        inline: 'nearest'
      });

      setTimeout(() => {
        result.header.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }, 50);

      setTimeout(() => {
        const newTargetRect = result.header.getBoundingClientRect();
        const newContainerRect = container.getBoundingClientRect();

        if (newTargetRect.top < newContainerRect.top || newTargetRect.bottom > newContainerRect.bottom) {
          container.scrollTop += (newTargetRect.top + newTargetRect.height / 2) -
            (newContainerRect.top + newContainerRect.height / 2);
        }
      }, 100);
    }

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
      } catch (e) {
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

  buildTree();
})();
