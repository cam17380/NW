// ─── HelpRenderer: builds help overlay HTML from i18n keys ───
import { t } from '../i18n/I18n.js';

function h(key) { return t('help.' + key); }

function row2(cmd, descKey) {
  return `<tr><td><code>${cmd}</code></td><td>${h(descKey)}</td></tr>`;
}
function row3(cmd, mode, descKey) {
  return `<tr><td><code>${cmd}</code></td><td>${mode}</td><td>${h(descKey)}</td></tr>`;
}
function label3(descKey) {
  return `<tr><td colspan="3" style="color:#4fc3f7;font-weight:bold;padding:6px 4px;">${h(descKey)}</td></tr>`;
}
function note(descKey) {
  return `<p style="color:#8899aa;font-size:12px;margin:4px 0 8px 4px;">${h(descKey)}</p>`;
}

export function renderHelpContent() {
  const C = h('thCmd'), D = h('thDesc'), M = h('thMode');

  return `
    <h3>${h('secMode')}</h3>
    <table>
      <tr><th>${C}</th><th>${D}</th></tr>
      ${row2('enable', 'enable')}
      ${row2('configure terminal', 'confT')}
      ${row2('interface &lt;name&gt;', 'intName')}
      ${row2('exit', 'exit')}
      ${row2('end', 'end')}
    </table>

    <h3>${h('secConfig')}</h3>
    <table>
      <tr><th>${C}</th><th>${D}</th></tr>
      ${row2('hostname &lt;name&gt;', 'hostname')}
      ${row2('ip address &lt;ip&gt; &lt;mask&gt;', 'ipAddr')}
      ${row2('no shutdown', 'noShut')}
      ${row2('shutdown', 'shut')}
      ${row2('description &lt;text&gt;', 'desc')}
    </table>

    <h3>${h('secVlan')}</h3>
    <table>
      <tr><th>${C}</th><th>${M}</th><th>${D}</th></tr>
      ${row3('vlan &lt;id&gt;', 'config', 'vlanCreate')}
      ${row3('name &lt;name&gt;', 'config-vlan', 'vlanName')}
      ${row3('no vlan &lt;id&gt;', 'config', 'noVlan')}
      ${row3('switchport mode access', 'config-if', 'swAccess')}
      ${row3('switchport access vlan &lt;id&gt;', 'config-if', 'swAccessVlan')}
      ${row3('switchport mode trunk', 'config-if', 'swTrunk')}
      ${row3('switchport trunk allowed vlan &lt;list&gt;', 'config-if', 'swTrunkAllow')}
      ${row3('show vlan brief', 'EXEC', 'showVlan')}
      ${row3('show interfaces trunk', 'EXEC', 'showTrunk')}
      ${row3('show interfaces switchport', 'EXEC', 'showSwport')}
    </table>

    <h3>${h('secRoute')}</h3>
    <table>
      <tr><th>${C}</th><th>${M}</th><th>${D}</th></tr>
      ${row3('ip route &lt;network&gt; &lt;mask&gt; &lt;next-hop&gt;', 'config (R/FW/SV/L3SW)', 'ipRoute')}
      ${row3('no ip route &lt;network&gt; &lt;mask&gt; &lt;next-hop&gt;', 'config (R/FW/SV/L3SW)', 'noIpRoute')}
      ${row3('ip default-gateway &lt;ip&gt;', 'config (PC/SV)', 'defaultGw')}
      ${row3('show ip route', 'EXEC', 'showRoute')}
    </table>

    <h3>${h('secL3sw')}</h3>
    <table>
      <tr><th>${C}</th><th>${M}</th><th>${D}</th></tr>
      ${row3('interface vlan &lt;id&gt;', 'config (SW)', 'intVlan')}
      ${row3('ip address &lt;ip&gt; &lt;mask&gt;', 'config-if (SVI)', 'sviIp')}
      ${row3('ip route &lt;net&gt; &lt;mask&gt; &lt;hop&gt;', 'config (L3 SW)', 'l3Route')}
      ${row3('access-list / ip access-group', 'config / config-if', 'l3Acl')}
    </table>
    ${note('l3Note')}

    <h3>${h('secBond')}</h3>
    <table>
      <tr><th>${C}</th><th>${M}</th><th>${D}</th></tr>
      ${row3('bond-group &lt;name&gt;', 'config-if', 'bondGroup')}
      ${row3('no bond-group', 'config-if', 'noBond')}
      ${row3('show etherchannel summary', 'EXEC', 'showBond')}
    </table>
    ${note('bondNote')}

    <h3>${h('secDhcp')}</h3>
    <table>
      <tr><th>${C}</th><th>${M}</th><th>${D}</th></tr>
      ${row3('ip dhcp pool &lt;name&gt;', 'config', 'dhcpPool')}
      ${row3('network &lt;ip&gt; &lt;mask&gt;', 'dhcp-config', 'dhcpNet')}
      ${row3('default-router &lt;ip&gt;', 'dhcp-config', 'dhcpRouter')}
      ${row3('dns-server &lt;ip&gt;', 'dhcp-config', 'dhcpDns')}
      ${row3('lease &lt;days&gt; | infinite', 'dhcp-config', 'dhcpLease')}
      ${row3('ip dhcp excluded-address &lt;start&gt; [end]', 'config', 'dhcpExclude')}
      ${row3('ip address dhcp', 'config-if', 'ipDhcp')}
      ${row3('renew dhcp', 'privileged', 'renewDhcp')}
      ${row3('show ip dhcp pool', 'show', 'showDhcpPool')}
      ${row3('show ip dhcp binding', 'show', 'showDhcpBind')}
    </table>

    <h3>${h('secNat')}</h3>
    <table>
      <tr><th>${C}</th><th>${M}</th><th>${D}</th></tr>
      ${row3('ip nat inside', 'config-if', 'natInside')}
      ${row3('ip nat outside', 'config-if', 'natOutside')}
      ${row3('ip nat inside source static &lt;local&gt; &lt;global&gt;', 'config', 'natStatic')}
      ${row3('ip nat pool &lt;name&gt; &lt;start&gt; &lt;end&gt; netmask &lt;mask&gt;', 'config', 'natPool')}
      ${row3('ip nat inside source list &lt;acl&gt; pool &lt;name&gt;', 'config', 'natDynamic')}
      ${row3('show ip nat translations', 'EXEC', 'showNat')}
      ${row3('show ip nat statistics', 'EXEC', 'showNatStats')}
    </table>

    <h3>${h('secAcl')}</h3>
    <table>
      <tr><th>${C}</th><th>${M}</th><th>${D}</th></tr>
      ${label3('aclStdLabel')}
      ${row3('access-list &lt;1-99&gt; permit|deny &lt;network&gt; [wildcard]', 'config', 'aclStd')}
      ${label3('aclExtLabel')}
      ${row3('access-list &lt;100-199&gt; permit|deny &lt;proto&gt; &lt;src&gt; &lt;srcWC&gt; &lt;dst&gt; &lt;dstWC&gt; [eq &lt;port&gt;]', 'config', 'aclExt')}
      ${label3('aclApplyLabel')}
      ${row3('ip access-group &lt;acl-num&gt; in|out', 'config-if', 'aclApply')}
      ${row3('no ip access-group &lt;acl-num&gt; in|out', 'config-if', 'noAclApply')}
      ${label3('aclMgmtLabel')}
      ${row3('no access-list &lt;num&gt;', 'config', 'noAcl')}
      ${row3('show access-lists', 'EXEC', 'showAcl')}
    </table>
    ${note('aclNote')}

    <h3>${h('secFw')}</h3>
    <table>
      <tr><th>${C}</th><th>${M}</th><th>${D}</th></tr>
      ${row3('firewall policy &lt;seq&gt; permit|deny &lt;src&gt; &lt;srcWC&gt; &lt;dst&gt; &lt;dstWC&gt; &lt;proto&gt; [port]', 'config', 'fwPolicy')}
      ${row3('no firewall policy &lt;seq&gt;', 'config', 'noFwPolicy')}
      ${row3('no firewall policy all', 'config', 'noFwAll')}
      ${row3('show firewall policy', 'EXEC', 'showFw')}
    </table>
    ${note('fwNote')}

    <h3>${h('secVpn')}</h3>
    <table>
      <tr><th>${C}</th><th>${M}</th><th>${D}</th></tr>
      ${label3('vpnTunLabel')}
      ${row3('interface tunnel &lt;N&gt;', 'config', 'intTunnel')}
      ${row3('tunnel source &lt;if|ip&gt;', 'config-if (Tunnel)', 'tunSrc')}
      ${row3('tunnel destination &lt;ip&gt;', 'config-if (Tunnel)', 'tunDst')}
      ${row3('tunnel mode ipsec|gre', 'config-if (Tunnel)', 'tunMode')}
      ${label3('vpnIkeLabel')}
      ${row3('crypto isakmp policy &lt;num&gt;', 'config', 'isakmpPolicy')}
      ${row3('encryption aes|3des|des', 'config-isakmp', 'ikeEnc')}
      ${row3('hash sha|md5', 'config-isakmp', 'ikeHash')}
      ${row3('authentication pre-share|rsa-sig', 'config-isakmp', 'ikeAuth')}
      ${row3('group 1|2|5|14', 'config-isakmp', 'ikeGroup')}
      ${row3('lifetime &lt;seconds&gt;', 'config-isakmp', 'ikeLife')}
      ${label3('vpnIpsecLabel')}
      ${row3('crypto ipsec transform-set &lt;name&gt; &lt;t1&gt; [t2]', 'config', 'ipsecTs')}
      ${label3('vpnMapLabel')}
      ${row3('crypto map &lt;name&gt; &lt;seq&gt; ipsec-isakmp', 'config', 'cryptoMap')}
      ${row3('set peer &lt;ip&gt;', 'config-crypto-map', 'setPeer')}
      ${row3('set transform-set &lt;name&gt;', 'config-crypto-map', 'setTs')}
      ${row3('match address &lt;acl-num&gt;', 'config-crypto-map', 'matchAddr')}
      ${row3('crypto map &lt;name&gt;', 'config-if', 'applyCrypto')}
      ${label3('vpnShowLabel')}
      ${row3('show crypto isakmp sa', 'EXEC', 'showIsakmp')}
      ${row3('show crypto ipsec sa', 'EXEC', 'showIpsec')}
      ${row3('show interfaces tunnel', 'EXEC', 'showTunnel')}
      ${row3('no crypto isakmp policy &lt;num&gt;', 'config', 'noIsakmp')}
      ${row3('no crypto map &lt;name&gt;', 'config', 'noCrypto')}
    </table>
    ${note('vpnNote')}

    <h3>${h('secShow')}</h3>
    <table>
      <tr><th>${C}</th><th>${D}</th></tr>
      ${row2('show ip interface brief', 'showIpBrief')}
      ${row2('show running-config', 'showRun')}
      ${row2('show interfaces', 'showInt')}
      ${row2('show ip route', 'showRouteS')}
      ${row2('show ip nat translations', 'showNatS')}
      ${row2('show ip nat statistics', 'showNatStatsS')}
      ${row2('show firewall policy', 'showFwS')}
      ${row2('show access-lists', 'showAclS')}
      ${row2('show crypto isakmp sa', 'showIsakmpS')}
      ${row2('show crypto ipsec sa', 'showIpsecS')}
      ${row2('show interfaces tunnel', 'showTunnelS')}
      ${row2('show ip dhcp pool', 'showDhcpPoolS')}
      ${row2('show ip dhcp binding', 'showDhcpBindS')}
      ${row2('show arp', 'showArp')}
      ${row2('show etherchannel summary', 'showBondS')}
      ${row2('show packet-flow &lt;ip&gt; [proto] [port]', 'showPktFlow')}
      ${row2('test access &lt;ip&gt; &lt;tcp|udp|icmp&gt; [port]', 'testAccess')}
      ${row2('clear arp', 'clearArp')}
      ${row2('ping &lt;ip&gt;', 'ping')}
      ${row2('traceroute &lt;ip&gt;', 'traceroute')}
    </table>

    <h3>${h('secTips')}</h3>
    <table>
      <tr><td>${h('tipTabs')}</td></tr>
      <tr><td>${h('tipKeys')}</td></tr>
      <tr><td>${h('tipVlan')}</td></tr>
      <tr><td>${h('tipRoute')}</td></tr>
      <tr><td>${h('tipGw')}</td></tr>
      <tr><td>${h('tipNat')}</td></tr>
      <tr><td>${h('tipFw')}</td></tr>
      <tr><td>${h('tipAcl')}</td></tr>
      <tr><td>${h('tipExtAcl')}</td></tr>
      <tr><td>${h('tipSvi')}</td></tr>
      <tr><td>${h('tipBond')}</td></tr>
      <tr><td>${h('tipVpn')}</td></tr>
      <tr><td>${h('tipTunRoute')}</td></tr>
      <tr><td>${h('tipDhcp')}</td></tr>
      <tr><td>${h('tipRenew')}</td></tr>
      <tr><td>${h('tipTestAccess')}</td></tr>
      <tr><td>${h('tipPktFlow')}</td></tr>
      <tr><td>${h('tipDupIp')}</td></tr>
      <tr><td>${h('tipLearn')}</td></tr>
      <tr><td>${h('tipChallenge')}</td></tr>
      <tr><td>${h('tipZoom')}</td></tr>
    </table>
  `;
}
