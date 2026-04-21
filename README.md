# danmaku-phaser

Phaser 3 と TypeScript で動く、東方風の弾幕シューティングのサンプルです。

## 必要環境

- Node.js（[`.node-version`](.node-version) を参照。例: Node 22）

## セットアップ

```bash
npm install
```

## 開発サーバー

```bash
npm run dev
```

ブラウザで表示された URL を開くとプレイできます。

## ビルド

```bash
npm run build
```

成果物は `dist/` に出力されます。

## プレビュー（本番ビルドの確認）

```bash
npm run preview
```

## 操作

| 操作 | キー |
|------|------|
| 移動 | 矢印 / WASD |
| ショット | Space / Z |
| 低速移動（当たり判定表示） | Shift |

ボスを倒すと **STAGE CLEAR**、ライフが尽きると **GAME OVER** です。どちらも **R** で最初からやり直せます。

## 技術スタック

- [Vite](https://vite.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Phaser 3](https://phaser.io/)

## 注意事項（Cursor利用時）

このプロジェクトは Cursor を使って作成しています。  
生成補助の過程で、意図せず公開コードに近い実装を取り込んでしまう可能性はゼロではありません。

- 公開前に `git diff` で差分を確認する
- 必要なら類似コード検索やライセンス確認を行う
- 明らかに外部由来と思われる断片は書き換える

上記を実施して、著作権・ライセンス上のリスクを下げることを推奨します。

## ライセンス

[MIT License](LICENSE)
