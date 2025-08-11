class CommonEventsDef {
    static page_ready = 'page_ready';
}


class LS {
    static get(key) {
        return localStorage.getItem(key);
    }

    static remove(key) {
        localStorage.removeItem(key);
    }

    static async getOnMiss(key, fetcher) {
        let value = LS.get(key);
        if (!value) {
            value = await fetcher();
            if (value) {
                LS.set(key, value);
            }
        }
        return value;
    }

    static set(key, value) {
        localStorage.setItem(key, value);
    }
}

const params = new URLSearchParams(new URL(window.location.href).search);

function isOk(res) {
    return res.code === 'OK';
}

class APICaller {
    static _baseUrl = "";

    static setBaseUrl(baseUrl) {
        APICaller._baseUrl = baseUrl;
    }

    static _apiResIntercepts = [];

    static addResponseInterceptor(inter) {
        APICaller._apiResIntercepts.push(inter);
    }

    static async post(url, reqInstance) {
        const requestStr = JSON.stringify(reqInstance);

        const headers = {'Content-Type': 'application/json'};
        APICaller.processHeaderToken(headers);
        const httpResponse = await fetch(APICaller._baseUrl + url, {
            method: 'POST',
            headers: headers,
            body: requestStr,
        });

        const responseText = await httpResponse.text();
        console.log(`--------------\n${url}\n${requestStr}\n${responseText}`);
        const codeData = JSON.parse(responseText);
        //
        for (const inter of APICaller._apiResIntercepts) {
            if (inter) {
                // rules 如果拦截器返回 true 就不在继续执行直接返回。
                if (await inter(codeData)) {
                    return;
                }
            }
        }
        return codeData;
    }

    static processHeaderToken(headers) {
        const token = localStorage.getItem('t');
        if (token) {
            headers.t = token;
        }
    }

}

class EventOp {
    // ---------------------------------------------------
    // base methods
    static _pub(tar, eventName, message) {
        //
        tar.dispatchEvent(
            new CustomEvent(eventName, {
                bubbles: true, // 使事件可以向上冒泡
                composed: true, // 使事件可以穿过Shadow DOM边界
                detail: message,
            }),
        );
    }

    static _sub(tar, eventName, callback) {
        tar.addEventListener(eventName, async (message) => {
            if (callback) await callback(message.detail);
        });
    }

    // ---------------------------------------------------
    // current window methods

    static pub(eventName, message) {
        console.log('pub', eventName, message);
        EventOp._pub(window, eventName, message);
    }

    static sub(eventName, callbacks) {
        for (const callback of callbacks) {
            EventOp._sub(window, eventName, callback);
        }
    }

    // ---------------------------------------------------
    // cross window methods
    static pub2parent(eventName, message) {
        EventOp._pub(window.parent, eventName, message);
    }

    static pub2children(childrenIds, message) {
        for (const childId of childrenIds) {
            var iframe = document.getElementById(childId);
            EventOp._pub(iframe, eventName, message);
        }
    }

    // ---------------------------------------------------
    static cfg(cfgDict) {
        const keys = Object.keys(cfgDict);
        for (const key of keys) {
            const value = cfgDict[key];
            EventOp.sub(key, value);
        }
    }
}

function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function copyElValue2Clipboard(elId) {
    const el = document.getElementById(elId);
    const text = el.value || el.textContent || el.innerText;
    copy2Clipboard(text);
}

function copy2Clipboard(text, toastMsg) {
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        if (toastOk) {
            toastOk(toastMsg || '复制成功');
        }
    } catch (e) {
        if (toastErr) {
            toastErr('复制失败,浏览器不支持自动复制,请尝试手动选择复制。');
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const download = async function (downloadUrl, fileName) {
    // 向后端发送请求
    try {
        const response = await fetch(downloadUrl);

        // 检查响应是否成功
        if (!response.ok) {
            return {
                code: 'download_fail'
            }
        }

        // 将响应转换为 Blob
        const blob = await response.blob();

        // 创建临时链接触发下载
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName; // 设置下载文件名
        document.body.appendChild(link);
        link.click();

        // 清理临时链接
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return {
            code: 'OK'
        }
    } catch (e) {
        console.error('发生异常:', e); // 打印异常
        return {
            code: 'download_fail'
        }
    }
}

const createApp = function (config) {
    (async () => {
        config.delimiters = ['${', '}'];
        if (!config.el) config.el = '#mainContainer';
        let app = new Vue(config);
        if (app.init) await app.init();
    })();
};
