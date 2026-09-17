import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
fs.mkdirSync('.local/runtime',{recursive:true});
fs.mkdirSync('.local/phase8/swift-cache',{recursive:true});
const result=spawnSync('/usr/bin/xcrun',['swiftc','-module-cache-path','.local/phase8/swift-cache','-framework','Security','native/credential-store.swift','-o','.local/runtime/credential-store'],{stdio:'inherit'});
if(result.status!==0)process.exit(result.status??1);
