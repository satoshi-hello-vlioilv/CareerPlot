/**
 * ZIPアーカイブユーティリティ - 人事評定視覚化アプリケーション
 *
 * データのインポート/エクスポートをZIP形式で扱うための最小構成の実装。
 * 外部ライブラリに依存せず、ブラウザ標準のCompressionStream/DecompressionStreamで
 * deflate圧縮を行う。非対応環境では無圧縮(stored)で書き出すため、
 * どの環境でも「壊れないZIP」を生成できる。
 */
class ZipArchive {
    /** ローカルファイルヘッダ・セントラルディレクトリ・EOCDのシグネチャ */
    static SIG = { LOCAL: 0x04034b50, CENTRAL: 0x02014b50, EOCD: 0x06054b50 };

    /** deflate圧縮が利用できる環境か */
    static get canDeflate() {
        return typeof CompressionStream === 'function';
    }

    /** deflate展開が利用できる環境か */
    static get canInflate() {
        return typeof DecompressionStream === 'function';
    }

    /**
     * 先頭バイト列からZIPファイルかどうかを判定する
     * @param {Uint8Array} bytes ファイル先頭のバイト列
     * @returns {boolean}
     */
    static isZip(bytes) {
        return !!bytes && bytes.length > 3 &&
            bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
    }

    /**
     * ZIPファイルを生成する
     * @param {Array<{name: string, content: string|Uint8Array}>} entries 格納するファイル
     * @returns {Promise<Blob>} ZIPファイルのBlob
     */
    static async create(entries) {
        const encoder = new TextEncoder();
        const parts = [];       // ローカルファイル部
        const central = [];     // セントラルディレクトリ部
        let offset = 0;

        for (const entry of entries) {
            const nameBytes = encoder.encode(entry.name);
            const raw = typeof entry.content === 'string' ? encoder.encode(entry.content) : entry.content;
            const crc = this._crc32(raw);
            const deflated = this.canDeflate ? await this._deflate(raw) : null;
            // 圧縮しても小さくならない場合は無圧縮で格納する
            const useDeflate = !!deflated && deflated.length < raw.length;
            const body = useDeflate ? deflated : raw;
            const method = useDeflate ? 8 : 0;
            const { time, date } = this._dosDateTime(new Date());

            const local = new Uint8Array(30 + nameBytes.length);
            const lv = new DataView(local.buffer);
            lv.setUint32(0, this.SIG.LOCAL, true);
            lv.setUint16(4, 20, true);          // 展開に必要なバージョン
            lv.setUint16(6, 0x0800, true);      // 汎用フラグ: ファイル名はUTF-8
            lv.setUint16(8, method, true);
            lv.setUint16(10, time, true);
            lv.setUint16(12, date, true);
            lv.setUint32(14, crc, true);
            lv.setUint32(18, body.length, true);
            lv.setUint32(22, raw.length, true);
            lv.setUint16(26, nameBytes.length, true);
            lv.setUint16(28, 0, true);          // 拡張フィールド長
            local.set(nameBytes, 30);

            parts.push(local, body);

            const cd = new Uint8Array(46 + nameBytes.length);
            const cv = new DataView(cd.buffer);
            cv.setUint32(0, this.SIG.CENTRAL, true);
            cv.setUint16(4, 20, true);          // 作成バージョン
            cv.setUint16(6, 20, true);          // 展開に必要なバージョン
            cv.setUint16(8, 0x0800, true);
            cv.setUint16(10, method, true);
            cv.setUint16(12, time, true);
            cv.setUint16(14, date, true);
            cv.setUint32(16, crc, true);
            cv.setUint32(20, body.length, true);
            cv.setUint32(24, raw.length, true);
            cv.setUint16(28, nameBytes.length, true);
            cv.setUint32(42, offset, true);     // ローカルヘッダ位置
            cd.set(nameBytes, 46);
            central.push(cd);

            offset += local.length + body.length;
        }

        const centralSize = central.reduce((sum, c) => sum + c.length, 0);
        const eocd = new Uint8Array(22);
        const ev = new DataView(eocd.buffer);
        ev.setUint32(0, this.SIG.EOCD, true);
        ev.setUint16(8, entries.length, true);   // このディスク上のエントリ数
        ev.setUint16(10, entries.length, true);  // 全エントリ数
        ev.setUint32(12, centralSize, true);
        ev.setUint32(16, offset, true);

        return new Blob([...parts, ...central, eocd], { type: 'application/zip' });
    }

    /**
     * ZIPファイルを読み込み、格納されたファイル一覧を返す
     * @param {ArrayBuffer|Uint8Array} buffer ZIPファイルの内容
     * @returns {Promise<Array<{name: string, bytes: Uint8Array, text: string}>>}
     */
    static async read(buffer) {
        const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

        // EOCD(終端レコード)を末尾から探索する
        let eocd = -1;
        for (let i = bytes.length - 22; i >= 0 && i >= bytes.length - 22 - 0xffff; i--) {
            if (view.getUint32(i, true) === this.SIG.EOCD) { eocd = i; break; }
        }
        if (eocd < 0) throw new Error('ZIPファイルの終端情報が見つかりません。ファイルが破損している可能性があります。');

        const count = view.getUint16(eocd + 10, true);
        let ptr = view.getUint32(eocd + 16, true);
        const decoder = new TextDecoder();
        const files = [];

        for (let i = 0; i < count; i++) {
            if (view.getUint32(ptr, true) !== this.SIG.CENTRAL) {
                throw new Error('ZIPファイルの構造が不正です。');
            }
            const method = view.getUint16(ptr + 10, true);
            const compSize = view.getUint32(ptr + 20, true);
            const rawSize = view.getUint32(ptr + 24, true);
            const nameLen = view.getUint16(ptr + 28, true);
            const extraLen = view.getUint16(ptr + 30, true);
            const commentLen = view.getUint16(ptr + 32, true);
            const localOffset = view.getUint32(ptr + 42, true);
            const name = decoder.decode(bytes.subarray(ptr + 46, ptr + 46 + nameLen));

            // 実データ位置はローカルヘッダの可変長領域を読み飛ばして求める
            const localNameLen = view.getUint16(localOffset + 26, true);
            const localExtraLen = view.getUint16(localOffset + 28, true);
            const dataStart = localOffset + 30 + localNameLen + localExtraLen;
            const body = bytes.subarray(dataStart, dataStart + compSize);

            let content;
            if (method === 0) {
                content = body;
            } else if (method === 8) {
                if (!this.canInflate) throw new Error('この環境では圧縮されたZIPを展開できません。');
                content = await this._inflate(body);
            } else {
                throw new Error(`未対応の圧縮方式です (method=${method})。`);
            }
            if (rawSize && content.length !== rawSize) {
                throw new Error(`ファイル「${name}」の展開結果が不正です。`);
            }

            // ディレクトリエントリは除外する
            if (!name.endsWith('/')) {
                files.push({ name, bytes: content, text: decoder.decode(content) });
            }
            ptr += 46 + nameLen + extraLen + commentLen;
        }
        return files;
    }

    // --- 内部ユーティリティ ---

    static async _deflate(data) {
        try {
            const stream = new Blob([data]).stream().pipeThrough(new CompressionStream('deflate-raw'));
            return new Uint8Array(await new Response(stream).arrayBuffer());
        } catch (e) {
            console.warn('deflate圧縮に失敗したため無圧縮で格納します:', e);
            return null;
        }
    }

    static async _inflate(data) {
        const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return new Uint8Array(await new Response(stream).arrayBuffer());
    }

    /** CRC32テーブル（初回利用時に生成してキャッシュ） */
    static _crcTable() {
        if (this.__crcTable) return this.__crcTable;
        const table = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
            table[i] = c >>> 0;
        }
        this.__crcTable = table;
        return table;
    }

    static _crc32(data) {
        const table = this._crcTable();
        let crc = 0xffffffff;
        for (let i = 0; i < data.length; i++) {
            crc = (crc >>> 8) ^ table[(crc ^ data[i]) & 0xff];
        }
        return (crc ^ 0xffffffff) >>> 0;
    }

    /** JavaScriptのDateをMS-DOS形式の日付・時刻に変換する */
    static _dosDateTime(d) {
        return {
            time: (d.getHours() << 11) | (d.getMinutes() << 5) | (Math.floor(d.getSeconds() / 2)),
            date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
        };
    }
}
