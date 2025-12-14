Component({
    data: {
        selected: 0,
        color: "#B0B8C1",
        selectedColor: "#10B981",
        list: [{
            pagePath: "/pages/home/index",
            text: "首页",
            // Home: Symmetrical House
            // Roof: M3 10 L12 2 L21 10
            // Body: M5 10 V20 H19 V10
            iconPath: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjQjBCOEMxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMyAxMCBMMTIgMiBMMjEgMTAiIC8+PHBhdGggZD0iTTUgMTAgVjIwIEgxOSBWMTAiIC8+PC9zdmc+",
            selectedIconPath: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTBCOTgxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMyAxMCBMMTIgMiBMMjEgMTAiIC8+PHBhdGggZD0iTTUgMTAgVjIwIEgxOSBWMTAiIC8+PC9zdmc+"
        }, {
            pagePath: "/pages/diet/index/index",
            text: "饮食",
            // Diet: Symmetrical Apple (Fixed)
            // Body: M12 21 C7 21 5 16 5 11 C5 6 8 4 12 4 C16 4 19 6 19 11 C19 16 17 21 12 21 Z
            // Stem: M12 4 V2
            // Leaf: M12 2 Q14 2 15 5
            // Base64 Grey: PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjQjBCOEMxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgMjEgQzcgMjEgNSAxNiA1IDExIEM1IDYgOCA0IDEyIDQgQzE2IDQgMTkgNiAxOSAxMSBDMTkgMTYgMTcgMjEgMTIgMjEgWiIgLz48cGF0aCBkPSJNMTIgNCBWMiIgLz48cGF0aCBkPSJNMTIgMiBRMTUgMiAxNSA2IiAvPjwvc3ZnPg==
            iconPath: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjQjBCOEMxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgMjEgQzcgMjEgNSAxNiA1IDExIEM1IDYgOCA0IDEyIDQgQzE2IDQgMTkgNiAxOSAxMSBDMTkgMTYgMTcgMjEgMTIgMjEgWiIgLz48cGF0aCBkPSJNMTIgNCBWMiIgLz48cGF0aCBkPSJNMTIgMiBRMTUgMiAxNSA2IiAvPjwvc3ZnPg==",
            // Base64 Green: PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTBCOTgxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgMjEgQzcgMjEgNSAxNiA1IDExIEM1IDYgOCA0IDEyIDQgQzE2IDQgMTkgNiAxOSAxMSBDMTkgMTYgMTcgMjEgMTIgMjEgWiIgLz48cGF0aCBkPSJNMTIgNCBWMiIgLz48cGF0aCBkPSJNMTIgMiBRMTUgMiAxNSA2IiAvPjwvc3ZnPg==
            selectedIconPath: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTBCOTgxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgMjEgQzcgMjEgNSAxNiA1IDExIEM1IDYgOCA0IDEyIDQgQzE2IDQgMTkgNiAxOSAxMSBDMTkgMTYgMTcgMjEgMTIgMjEgWiIgLz48cGF0aCBkPSJNMTIgNCBWMiIgLz48cGF0aCBkPSJNMTIgMiBRMTUgMiAxNSA2IiAvPjwvc3ZnPg=="
        }, {
            pagePath: "/pages/exercise/index/index",
            text: "运动",
            // Exercise: Symmetrical Pulse
            iconPath: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjQjBCOEMxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMiAxMiBINSBMMTAgMyBMMTQgMjEgTDE5IDEyIEgyMiIgLz48L3N2Zz4=",
            selectedIconPath: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTBCOTgxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMiAxMiBINSBMMTAgMyBMMTQgMjEgTDE5IDEyIEgyMiIgLz48L3N2Zz4="
        }, {
            pagePath: "/pages/mine/index/index",
            text: "我的",
            // Mine: Symmetrical User
            iconPath: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjQjBCOEMxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjgiIHI9IjQiIC8+PHBhdGggZD0iTTYgMjEgdjAgTTE4IDIxIHYwIiAvPjxwYXRoIGQ9Ik02IDIxIEE2IDYgMCAwIDEgMTggMjEiIC8+PC9zdmc+",
            selectedIconPath: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMTBCOTgxIiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjgiIHI9IjQiIC8+PHBhdGggZD0iTTYgMjEgdjAgTTE4IDIxIHYwIiAvPjxwYXRoIGQ9Ik02IDIxIEE2IDYgMCAwIDEgMTggMjEiIC8+PC9zdmc+"
        }]
    },
    methods: {
        switchTab(e) {
            const data = e.currentTarget.dataset
            const url = data.path
            wx.switchTab({ url })
        }
    }
})
