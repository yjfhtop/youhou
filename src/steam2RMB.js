// ==UserScript==
// @name         steam TL(里拉, 土耳其)转 人民币
// @namespace    https://store.steampowered.com/tl2RMB
// @version      0.1
// @description  steam TL(里拉, 土耳其币)转 人民币
// @author       yjfh
// @match        https://store.steampowered.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=steampowered.com
// @grant        none
// @connect      *
// @require
// ==/UserScript==

(function () {
    // 先从本地获取之前存储的汇率, 如果有, 判断是存储的间隔天数是否大于 ExchangeRateMaxTime, 大于就从接口尝试获取汇率(更新缓存). 小于的话旧直接使用缓存
    // 如果没有获取到缓存, 则从接口获取汇率(更新缓存)
    const locKeyObj = {
        exchangeRateSaveKey: 'exchangeRateSaveKey',
        exchangeRateSaveTimeKey: 'exchangeRateSaveTimeKey',
    };
    // 汇率最大的有效时间
    const ExchangeRateMaxTime = 1000 * 60 * 24 * 1;
    // 替换后的人民币单位
    const RMBUnit = '元';

    const ReplaceElPricesType = {
        nodeValue: 'nodeValue',
        innerText: 'innerText',
    };

    // 货币代码对应的汇率
    // TRY(土耳其)
    const ExchangeRateDef = {
        // 货币代码
        TRY: {
            // 当前货币的1单位 兑换成 人民币 是多少
            rate: 0.36,
            // 货币单位
            unit: 'TL',
        },
    };

    // 尝试将字符转为 js 类型
    function tryJson(data) {
        if (typeof data === 'string') {
            try {
                return JSON.parse(data);
            } catch (e) {
                return data;
            }
        }
        return data;
    }

    /**
     * 获取汇率
     */
    function getExchangeRate() {
        // 放弃了, 懒得使用, 直接用默认值
        // $.ajax({
        //     url: 'https://api.exchangeratesapi.io/latest',
        //     type: 'GET',
        //     data: {
        //         base: newMoneyCode,
        //         symbols: oldMoneyCode
        //     },
        //     success: function (result) {
        //         console.log(result);
        //     }
        // });
        return new Promise((resolve) => {
            const saveData = ExchangeRateDef;
            localStorage.setItem(locKeyObj.exchangeRateSaveKey, JSON.stringify(saveData));
            localStorage.setItem(locKeyObj.exchangeRateSaveTimeKey, JSON.stringify(Date.now()));
            resolve(saveData);
        });
    }

    async function getInitData() {
        const rateObj = tryJson(localStorage.getItem(locKeyObj.exchangeRateSaveKey));
        const rateTime = tryJson(localStorage.getItem(locKeyObj.exchangeRateSaveTimeKey));
        const nowTime = Date.now();
        let useRateObj = rateObj || ExchangeRateDef;
        if (rateObj && rateTime && rateTime + ExchangeRateMaxTime >= nowTime) {
            // 缓存有效
            useRateObj = rateObj;
        } else {
            // 重新拉取缓存
            useRateObj = await getExchangeRate();
        }
        // 类型为 ExchangeRateDef
        return useRateObj;
    }

    // 货币单位映射 价格 和 货币代码
    function exchangeRate2Unit2ExchangeRateObj(data) {
        const targetObj = {};
        Object.keys(data).forEach((key) => {
            const item = data[key];
            targetObj[item.unit] = { ...item, code: key };
        });
        return targetObj;
    }

    // 去除字符左右的空格 和 所有的换行
    function delStrLRNL(str) {
        if (typeof str !== 'string') {
            return '';
        }
        return str.trim().replace(/\n/g, '');
    }

    function txtGetUnitAndPrices(txt) {
        if (!txt) {
            return null;
        }
        try {
            const useTxt = delStrLRNL(txt);
            const allArr = useTxt.split(' ');
            const unit = allArr[1];
            const prices = parseFloat(allArr[0].replace(',', '.'));
            return {
                unit,
                prices,
            };
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    // 替换元素价格 useType = nodeValue | innerText
    // nodeIndex: 当 useType = nodeValue, 时使用,代表使用第几个子节点
    function replaceElPrices(
        el,
        unit2ExchangeRateObj,
        useType = ReplaceElPricesType.innerText,
        nodeIndex = 0,
    ) {
        try {
            if (!el) return;
            let useTxt = null;
            if (useType === ReplaceElPricesType.innerText) {
                useTxt = el.innerText;
            } else {
                useTxt = el.childNodes[nodeIndex].nodeValue;
            }
            if (useTxt.indexOf(RMBUnit) >= 0) {
                // 已经替换了, 不需要再次替换
                return;
            }
            const useObj = txtGetUnitAndPrices(useTxt);
            if (useObj) {
                const oldTxt = useTxt;
                const newPrices = useObj.prices * unit2ExchangeRateObj[useObj.unit].rate;
                const targetStr = `${newPrices.toFixed(2)} ${RMBUnit} ${oldTxt}`;
                if (useType === ReplaceElPricesType.innerText) {
                    el.innerText = targetStr;
                } else {
                    el.childNodes[nodeIndex].nodeValue = targetStr;
                }
            }
        } catch (e) {
            console.error(e, 'replaceElPrices');
        }
    }

    async function main() {
        const useRateObj = await getInitData();
        const unit2ExchangeRateObj = exchangeRate2Unit2ExchangeRateObj(useRateObj);

        // .discount_prices>.discount_original_price
        // .discount_prices>.discount_final_price
        // 190,00 TL
        // 推荐 s
        document.querySelectorAll('.discount_prices>.discount_original_price').forEach((item) => {
            replaceElPrices(item, unit2ExchangeRateObj);
        });
        document.querySelectorAll('.discount_prices>.discount_final_price').forEach((item) => {
            replaceElPrices(item, unit2ExchangeRateObj);
        });
        // 推荐 e

        // 优惠 s
        document
            .querySelectorAll(
                '.salepreviewwidgets_StoreSaleDiscountedPriceCtn_3GLeQ>.salepreviewwidgets_StoreOriginalPrice_1EKGZ',
            )
            .forEach((item) => {
                replaceElPrices(item, unit2ExchangeRateObj);
            });
        document
            .querySelectorAll(
                '.salepreviewwidgets_StoreSaleDiscountedPriceCtn_3GLeQ>.salepreviewwidgets_StoreSalePriceBox_Wh0L8',
            )
            .forEach((item) => {
                replaceElPrices(item, unit2ExchangeRateObj);
            });
        // 优惠 e

        // 搜索 s
        document
            .querySelectorAll('.col.search_price.responsive_secondrow:not(.discounted)')
            .forEach((item) => {
                replaceElPrices(item, unit2ExchangeRateObj);
            });
        document
            .querySelectorAll('.col.search_price.discounted.responsive_secondrow')
            .forEach((item) => {
                replaceElPrices(item.querySelector('strike'), unit2ExchangeRateObj);
                replaceElPrices(item, unit2ExchangeRateObj, ReplaceElPricesType.nodeValue, 3);
            });
        // 搜索 e
    }

    const time = 1000 * 3;
    setTimeout(() => {
        main();
    }, time);
    document.addEventListener('click', () => {
        main();
        setTimeout(() => {
            main();
        }, time);
    });
})();
