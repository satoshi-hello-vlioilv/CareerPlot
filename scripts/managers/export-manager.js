/**
 * 画像エクスポート機能管理クラス - 人事評定視覚化アプリケーション
 * html2canvas を用いてチャート領域を画像化・ダウンロードする
 */
class ExportManager {
    constructor(appController) {
        this.appController = appController;
        this.appUI = appController.appUI;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const exportImageBtn = document.getElementById('exportImageBtn');
        if (exportImageBtn) {
            exportImageBtn.addEventListener('click', () => {
                this.appUI.showModal('exportImageModal');
            });
        }

        const modeRadios = document.querySelectorAll('input[name="exportImageMode"]');
        const splitGroup = document.getElementById('splitSettingsGroup');
        modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (e.target.value === 'split') {
                    splitGroup.style.display = 'block';
                } else {
                    splitGroup.style.display = 'none';
                }
            });
        });

        const executeBtn = document.getElementById('executeExportImageBtn');
        if (executeBtn) {
            executeBtn.addEventListener('click', () => {
                this.exportImage();
            });
        }

        const cancelBtn = document.getElementById('cancelExportImageBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.appUI.hideModal('exportImageModal');
            });
        }

        const closeBtn = document.getElementById('closeExportImageModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.appUI.hideModal('exportImageModal');
            });
        }
    }

    async exportImage() {
        let targetElement = document.getElementById('chartContainer');
        
        if (!targetElement || targetElement.querySelector('.empty-chart')) {
            this.appUI.showNotification('warning', 'エラー', '出力するチャートがありません。');
            return;
        }

        // テーブル要素などを直接ターゲットにしてスクロール領域の影響を軽減
        const chartContent = targetElement.querySelector('table') || targetElement.firstElementChild;
        if (chartContent && !chartContent.classList.contains('empty-chart')) {
            targetElement = chartContent;
        }

        const mode = document.querySelector('input[name="exportImageMode"]:checked').value;
        const bgColor = document.getElementById('exportImageBgColor').value;
        
        const executeBtn = document.getElementById('executeExportImageBtn');
        const originalText = executeBtn.innerHTML;
        executeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 処理中...';
        executeBtn.disabled = true;

        try {
            // html2canvas のオプション
            const options = {
                backgroundColor: bgColor === 'transparent' ? null : bgColor,
                scale: 2, // 高画質化
                useCORS: true,
                logging: false,
                onclone: (clonedDoc) => {
                    // クローンされたDOMに対する前処理（見切れ防止）
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

            const canvas = await html2canvas(targetElement, options);

            if (mode === 'single') {
                this.downloadCanvas(canvas, `chart_export_${this.getFormattedDate()}.png`);
            } else {
                const direction = document.getElementById('splitDirection').value;
                const count = parseInt(document.getElementById('splitCount').value, 10) || 2;
                
                await this.splitAndDownloadCanvas(canvas, direction, count);
            }

            this.appUI.showNotification('success', '出力完了', '画像の出力を完了しました。');
            this.appUI.hideModal('exportImageModal');
        } catch (error) {
            console.error('画像エクスポートエラー:', error);
            this.appUI.showNotification('error', '出力失敗', '画像の出力中にエラーが発生しました。');
        } finally {
            executeBtn.innerHTML = originalText;
            executeBtn.disabled = false;
        }
    }

    async splitAndDownloadCanvas(sourceCanvas, direction, count) {
        const totalWidth = sourceCanvas.width;
        const totalHeight = sourceCanvas.height;
        
        for (let i = 0; i < count; i++) {
            const partCanvas = document.createElement('canvas');
            const ctx = partCanvas.getContext('2d');
            
            let sx, sy, sWidth, sHeight;
            
            if (direction === 'horizontal') {
                // 横方向に分割（幅を分割）
                sWidth = Math.floor(totalWidth / count);
                sHeight = totalHeight;
                sx = i * sWidth;
                sy = 0;
                // 最後の部分は端数を吸収
                if (i === count - 1) sWidth = totalWidth - sx;
                
                partCanvas.width = sWidth;
                partCanvas.height = sHeight;
            } else {
                // 縦方向に分割（高さを分割）
                sWidth = totalWidth;
                sHeight = Math.floor(totalHeight / count);
                sx = 0;
                sy = i * sHeight;
                // 最後の部分は端数を吸収
                if (i === count - 1) sHeight = totalHeight - sy;
                
                partCanvas.width = sWidth;
                partCanvas.height = sHeight;
            }
            
            ctx.drawImage(
                sourceCanvas, 
                sx, sy, sWidth, sHeight, // source
                0, 0, sWidth, sHeight    // destination
            );
            
            // 複数ファイルの連続ダウンロードでブラウザにブロックされないよう少し間隔を空ける
            await new Promise(resolve => setTimeout(resolve, 300));
            this.downloadCanvas(partCanvas, `chart_export_${this.getFormattedDate()}_part${i + 1}.png`);
        }
    }

    downloadCanvas(canvas, filename) {
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    getFormattedDate() {
        const d = new Date();
        return `${d.getFullYear()}${(d.getMonth()+1).toString().padStart(2, '0')}${d.getDate().toString().padStart(2, '0')}_${d.getHours().toString().padStart(2, '0')}${d.getMinutes().toString().padStart(2, '0')}`;
    }
}