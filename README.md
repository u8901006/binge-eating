# Binge Eating Research Daily Report

> 暴食症（Binge Eating Disorder）研究文獻日報，每日自動從 PubMed 彙整最新論文，由 Zhipu AI 分析生成。

## 🌐 網站

**[https://u8901006.github.io/binge-eating/](https://u8901006.github.io/binge-eating/)**

## 🔧 運作方式

1. **GitHub Actions** 每天 GMT+8 07:40 自動執行
2. 從 **PubMed** 搜尋前 7 天的暴食症相關文獻（排除已總結的論文）
3. 使用 **Zhipu AI (GLM-5-Turbo)** 進行摘要、分類、PICO 分析
4. 生成漂亮的 **HTML 日報**，部署至 GitHub Pages

## 🔍 搜尋範圍

- 涵蓋 30+ 本飲食障礙、精神醫學、神經科學、營養、肥胖、運動醫學等期刊
- 11 組搜尋策略（診斷、治療、藥物、神經科學、情緒、肥胖、營養、社會、運動、食物成癮、系統性回顧）
- 只總結前 7 天尚未被總結的新文獻

## 🏥 相關連結

- [李政洋身心診所](https://www.leepsyclinic.com/)
- [訂閱電子報](https://blog.leepsyclinic.com/)
- [Buy Me a Coffee](https://buymeacoffee.com/CYlee)

## 技術棧

- **Node.js 24** - 執行環境
- **PubMed E-utilities API** - 文獻搜尋
- **Zhipu AI GLM-5-Turbo** - 文獻分析（Fallback: GLM-4.7 → GLM-4.7-Flash）
- **GitHub Actions** - 自動化排程
- **GitHub Pages** - 靜態網站部署
