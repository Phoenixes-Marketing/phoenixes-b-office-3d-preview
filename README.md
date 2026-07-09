# 封王 B 版辦公室 3D 預覽

這是封王辦公室 B 版平面配置轉成的 Three.js 3D 預覽專案。

## 目前版本

- 格局骨架已鎖定：牆、柱、矮牆、門洞、門片、窗、入口階梯與地坪高度不應任意調整。
- 室內地坪：+60cm。
- 牆高預設：2m，可在畫面左下角調整。
- 目前已放入初版辦公家具配置：
  - 櫃檯/行銷部：2 人
  - 業務辦公區：8 人
  - 會計辦公區：4 人
  - 總經理辦公室：1 人
  - 協理辦公室：1 人
  - 20 人會議室：20 席

## 手機操作

- 單指拖曳：旋轉視角
- 雙指：縮放和平移
- 右上按鈕：重置視角、俯視、步行視角、標籤顯示切換

## 本機開發

```bash
cd app
npm install
npm run dev
```

## 建置

```bash
cd app
npm run build
```

## GitHub Pages

本專案使用 `.github/workflows/deploy-pages.yml` 部署。推送到 `main` 後，GitHub Actions 會自動建置 `app` 並發布 `app/dist` 到 GitHub Pages。
