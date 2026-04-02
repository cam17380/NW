# Network Simulator — Development Instructions

## Project Overview
Cisco IOS風のCLIを備えたネットワークシミュレータ（vanilla JS + ES Modules, ビルドステップなし）。
Router, Switch, Firewall, Server, PC のトポロジーを構成し、ping/traceroute/packet-flowでシミュレーション。

## Architecture Rules (MUST follow)

### 1. Device Feature Extension — 最重要ルール
新機能は **既存デバイスタイプを拡張** すること。新デバイスタイプは原則作らない。
- 型チェック `if (dev.type === 'xxx')` が16箇所以上に散在 → 新タイプ追加は全箇所修正必要
- 確立済みパターン: L3スイッチ=switch+SVI+`switchHasSVI(dv)`, VPN=router+Tunnel+`routerHasVPN(dv)`

### 2. Simulation Consistency — 三位一体
転送ロジック変更時は **3関数** に同等の実装が必要:
- `forwardPacket` (Routing.js) — 到達判定
- `buildPingPath` (PingEngine.js) — pingアニメーション用パス
- `tracePacketFlow` (PingEngine.js) — `show packet-flow` 診断

### 3. VLAN-Aware BFS
L2探索パスを新規追加する場合は `portCarriesVlan()` によるVLAN判定を必ず含めること。
過去にVLAN分離漏れバグあり (2fc538f で全パス修正済み)。

### 4. Snapshot Compatibility
新フィールド追加時は Snapshot.js の `getSnapshot()` と `applySnapshot()` の両方を更新。
`if (saved.xxx !== undefined)` パターンで後方互換性を維持。

## File Change Checklist
新機能追加時の全タッチポイント（詳細はメモリの dev_guide_architecture.md セクション2.2）:
- `Topology.js` — データモデル / `NetworkUtils.js` — IF名正規化
- `ConfigCommands.js` + `InterfaceCommands.js` + `ShowCommands.js` — CLIコマンド
- `CommandRegistry.js` (commandTree + hintData) + `Abbreviations.js` — ヒント・省略形
- `Routing.js` + `PingEngine.js` — シミュレーション（三位一体）
- `Snapshot.js` + `ConfigExport.js` — 永続化
- `CLIEngine.js` + `Store.js` — モード・ステート
- `index.html` — Help画面 / `Templates.js` — サンプル

## Debugging
`show packet-flow <ip>` でホップごとの転送判定を確認。新機能デバッグの最重要ツール。
自動テスト: `feature/test-mode` ブランチに52テスト（VLAN/ARP/Routing/FW/NAT/ACL/PacketFlow）。

## Known Bug Patterns
1. **デバイスタイプ間ロジック不整合** — 同じ判定を全タイプで一貫実装しているか確認
2. **Routing.js↔PingEngine.js不整合** — 片方だけ変更していないか確認
3. **Snapshot保存/復元漏れ** — デバイスレベル+IFレベル両方確認
4. **VLAN分離漏れ** — 新BFS探索にVLAN判定を含めたか確認

## Branch Strategy
- `main` — リリース安定版 (v1.1)
- `feature/switch-light-l3` — L3スイッチ+LACP+VPN (現在のメイン開発)
- `feature/test-mode` — テストモードUI+52テスト (mainから分岐、L3/VPN未統合)

## Syntax Check
```bash
node -c src/path/to/file.js && echo "OK"
```
