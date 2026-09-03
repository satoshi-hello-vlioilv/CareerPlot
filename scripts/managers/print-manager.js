/**
 * 印刷機能強化モジュール - 人事評定視覚化アプリケーション
 * html2canvas を用いてチャート領域を画像化し、正確なレイアウトで印刷機能を提供
 * 画像出力機能と同等の分割機能もサポートし、情報を途切れることなく印刷可能にする
 */
class PrintManager {
    constructor(appController) {
        this.appController = appController;
        // 印刷関連のUIを初期化
        this.initializePrintUI();
    }
    
    /**
     * 印刷関連のUIと機能を初期化
     */
    initializePrintUI() {
        // 印刷ボタンのイベントリスナーを設定
        const printBtn = document.getElementById('printBtn');
        const printBtn2 = document.getElementById('printBtn2');
        
        const setupBtn = (btn) => {
            if (!btn) return;
            // 既存のイベントリスナーをクリアして新しい処理を設定
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showPrintOptions();
            });
        };

        setupBtn(printBtn);
        setupBtn(printBtn2);
    }
    
    /**
     * 印刷オプションのモーダルを表示
     */
    showPrintOptions() {
        // 既存のモーダルがあれば削除
        const existingModal = document.getElementById('printOptionsModal');
        if (existingModal) {
            document.body.removeChild(existingModal);
        }
        
        // 印刷オプションモーダルを作成
        const modal = document.createElement('div');
        modal.id = 'printOptionsModal';
        modal.className = 'modal-overlay visible';
        
        // モーダル内容を設定
        modal.innerHTML = `
            <div class="modal" style="max-width: 500px;">
                <div class="modal-header">
                    <h3 class="modal-title"><i class="fas fa-print"></i> 印刷設定</h3>
                    <button class="modal-close" id="closePrintOptionsModal"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body">
                    <p class="text-sm mb-md text-muted">現在のチャートを画像化して印刷します。ブラウザの印刷ダイアログで最終プレビューが確認できます。</p>
                    
                    <div class="form-group">
                        <label class="form-label">印刷レイアウト</label>
                        <div class="radio-options">
                            <label class="radio-label">
                                <input type="radio" name="printMode" value="single" checked>
                                <span>1ページに収めて印刷</span>
                            </label>
                            <label class="radio-label">
                                <input type="radio" name="printMode" value="split">
                                <span>指定枚数に分割して印刷</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="form-group" id="printSplitSettingsGroup" style="display: none; background-color: var(--base-light-gray); padding: var(--spacing-sm); border-radius: var(--border-radius-sm); margin-bottom: var(--spacing-sm);">
                        <div class="form-row">
                            <div class="form-col">
                                <label class="form-label" for="printSplitDirection">分割方向</label>
                                <select id="printSplitDirection" class="form-input">
                                    <option value="horizontal">横方向（幅を分割）</option>
                                    <option value="vertical">縦方向（高さを分割）</option>
                                </select>
                            </div>
                            <div class="form-col">
                                <label class="form-label" for="printSplitCount">分割数</label>
                                <input type="number" id="printSplitCount" class="form-input" min="2" max="10" value="2">
                            </div>
                        </div>
                        <p class="text-xs text-muted mt-xs">※横長のチャートは横方向に、縦長の表は縦方向に分割すると見やすくなります。</p>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">用紙の向き</label>
                        <div class="radio-options">
                            <label class="radio-label">
                                <input type="radio" name="printOrientation" value="portrait" checked>
                                <span>縦向き (Portrait)</span>
                            </label>
                            <label class="radio-label">
                                <input type="radio" name="printOrientation" value="landscape">
                                <span>横向き (Landscape)</span>
                            </label>
                        </div>
                    </div>
                    
                    <div class="form-divider"></div>
                    
                    <div class="form-group" style="margin-top: 15px;">
                        <button id="printDirectBtn" class="btn btn-primary" style="width: 100%;">
                            <i class="fas fa-print"></i> 印刷ダイアログを開く
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // モーダルを表示
        document.body.appendChild(modal);
        
        // イベントリスナーを設定
        document.getElementById('closePrintOptionsModal').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        const modeRadios = document.querySelectorAll('input[name="printMode"]');
        const splitGroup = document.getElementById('printSplitSettingsGroup');
        modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'split') {
                    splitGroup.style.display = 'block';
                } else {
                    splitGroup.style.display = 'none';
                }
            });
        });

        // 「印刷」ボタンのイベントリスナー
        document.getElementById('printDirectBtn').addEventListener('click', () => {
            this.executePrint();
        });
    }

    /**
     * 画像化して印刷を実行する
     */
    async executePrint() {
        let targetElement = document.getElementById('chartContainer');
        if (!targetElement || targetElement.querySelector('.empty-chart')) {
            if (this.appController && this.appController.appUI) {
                this.appController.appUI.showNotification('warning', 'エラー', '印刷するチャートがありません。');
            }
            return;
        }

        const mode = document.querySelector('input[name="printMode"]:checked').value;
        const orientation = document.querySelector('input[name="printOrientation"]:checked').value;
        
        const executeBtn = document.getElementById('printDirectBtn');
        const originalText = executeBtn.innerHTML;
        executeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 印刷データを準備中...';
        executeBtn.disabled = true;

        try {
            // テーブル要素などを直接ターゲットにしてスクロール領域の影響を軽減
            const chartContent = targetElement.querySelector('table') || targetElement.firstElementChild;
            const elementToRender = (chartContent && !chartContent.classList.contains('empty-chart')) ? chartContent : targetElement;

            // html2canvas のオプション設定（高画質化・見切れ防止）
            const options = {
                backgroundColor: '#ffffff', // 印刷は基本白背景
                scale: 2, // 高画質化
                useCORS: true,
                logging: false,
                onclone: (clonedDoc) => {
                    // クローンされたDOMに対する前処理
                    const clonedContainer = clonedDoc.getElementById('chartContainer');
                    if (clonedContainer) {
                        clonedContainer.style.overflow = 'visible';
                        clonedContainer.style.maxHeight = 'none';
                        clonedContainer.style.maxWidth = 'none';
                        clonedContainer.style.height = 'auto';
                        clonedContainer.style.width = 'auto';
                        clonedContainer.style.border = 'none';
                        clonedContainer.style.boxShadow = 'none';
                        
                        const tables = clonedContainer.querySelectorAll('table');
                        tables.forEach(table => {
                            table.style.width = 'auto';
                            table.style.maxWidth = 'none';
                        });
                    }
                }
            };

            const canvas = await html2canvas(elementToRender, options);
            
            // iframeを作成して印刷
            this.printFromCanvas(canvas, mode, orientation);
            
            // モーダルを閉じる
            const modal = document.getElementById('printOptionsModal');
            if (modal) document.body.removeChild(modal);
            
        } catch (error) {
            console.error('印刷用画像生成エラー:', error);
            if (this.appController && this.appController.appUI) {
                this.appController.appUI.showNotification('error', '処理失敗', '印刷データの生成中にエラーが発生しました。');
            }
        } finally {
            if (document.body.contains(executeBtn)) {
                executeBtn.innerHTML = originalText;
                executeBtn.disabled = false;
            }
        }
    }

    /**
     * キャンバスから印刷用iframeを作成して印刷を実行
     */
    printFromCanvas(sourceCanvas, mode, orientation) {
        // 印刷用の隠しiframeを作成
        let iframe = document.getElementById('printFrame');
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = 'printFrame';
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);
        }

        const doc = iframe.contentWindow.document;
        doc.open();
        
        // 基本スタイル構築
        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    @media print {
                        @page {
                            size: ${orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
                            margin: 10mm;
                        }
                        body {
                            margin: 0;
                            padding: 0;
                            background-color: #fff;
                        }
                        .page-break {
                            page-break-after: always;
                            break-after: page;
                        }
                        .print-container {
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            width: 100%;
                            height: 100vh;
                            box-sizing: border-box;
                        }
                        .print-img {
                            display: block;
                            margin: 0 auto;
                        }
                        .fit-single {
                            max-width: 100%;
                            max-height: 100%;
                            object-fit: contain;
                        }
                        .fit-split-horizontal {
                            width: 100%;
                            height: auto;
                            object-fit: contain;
                        }
                        .fit-split-vertical {
                            height: 100%;
                            width: auto;
                            max-width: 100%;
                            object-fit: contain;
                        }
                    }
                </style>
            </head>
            <body>
        `;

        if (mode === 'single') {
            const dataUrl = sourceCanvas.toDataURL('image/png');
            html += `<div class="print-container"><img src="${dataUrl}" class="print-img fit-single"></div>`;
        } else {
            const direction = document.getElementById('printSplitDirection').value;
            const count = parseInt(document.getElementById('printSplitCount').value, 10) || 2;
            
            const totalWidth = sourceCanvas.width;
            const totalHeight = sourceCanvas.height;
            
            for (let i = 0; i < count; i++) {
                const partCanvas = document.createElement('canvas');
                const ctx = partCanvas.getContext('2d');
                
                let sx, sy, sWidth, sHeight, imgClass;
                
                if (direction === 'horizontal') {
                    // 横方向（幅を分割）
                    sWidth = Math.floor(totalWidth / count);
                    sHeight = totalHeight;
                    sx = i * sWidth;
                    sy = 0;
                    if (i === count - 1) sWidth = totalWidth - sx;
                    imgClass = 'fit-split-horizontal';
                } else {
                    // 縦方向（高さを分割）
                    sWidth = totalWidth;
                    sHeight = Math.floor(totalHeight / count);
                    sx = 0;
                    sy = i * sHeight;
                    if (i === count - 1) sHeight = totalHeight - sy;
                    imgClass = 'fit-split-vertical';
                }
                
                partCanvas.width = sWidth;
                partCanvas.height = sHeight;
                ctx.drawImage(sourceCanvas, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);
                
                const dataUrl = partCanvas.toDataURL('image/png');
                html += `<div class="print-container ${i < count - 1 ? 'page-break' : ''}">
                            <img src="${dataUrl}" class="print-img ${imgClass}">
                         </div>`;
            }
        }

        html += `
            </body>
            </html>
        `;

        doc.write(html);
        doc.close();

        // 読み込みが完了したら印刷ダイアログを表示
        iframe.onload = () => {
            // setTimeoutを入れて描画完了と画像のロードを確実にする
            setTimeout(() => {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            }, 500);
        };
    }
}

// 印刷マネージャーをアプリケーションに統合するためのコード
document.addEventListener('DOMContentLoaded', () => {
    // アプリケーションが初期化されるのを待ってから印刷マネージャーを初期化
    const initPrintManager = () => {
        // ボタンがレンダリングされているか確認
        if (document.getElementById('printBtn') || document.getElementById('printBtn2')) {
            if (window.hrApp) {
                window.hrApp.printManager = new PrintManager(window.hrApp);
            } else {
                // アプリケーションがまだロードされていない場合は再試行
                setTimeout(initPrintManager, 100);
            }
        } else {
            // ボタンがまだレンダリングされていない場合は再試行
            setTimeout(initPrintManager, 100);
        }
    };
    
    // アプリケーション初期化後に印刷マネージャーを初期化
    setTimeout(initPrintManager, 300);
});