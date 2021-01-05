// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
'use strict';

// Not sure why but on windows, if you execute a process from the System32 directory, it will just crash Node.
// Not throw an exception, just make node exit.
// However if a system32 process is run first, everything works.
import * as child_process from 'child_process';
import * as os from 'os';
if (os.platform() === 'win32') {
    const proc = child_process.spawn('C:\\Windows\\System32\\Reg.exe', ['/?']);
    proc.on('error', () => {
        // tslint:disable-next-line: no-console
        console.error('error during reg.exe');
    });
}

// tslint:disable:no-any no-require-imports no-var-requires
if ((Reflect as any).metadata === undefined) {
    require('reflect-metadata');
}

console.error('xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx');
process.env.VSC_PYTHON_CI_TEST = '1';
process.env.VSC_PYTHON_UNIT_TEST = '1';
process.env.NODE_ENV = 'production'; // Make sure react is using production bits or we can run out of memory.

import { initialize } from './vscode-mock';

// Custom module loader so we skip .css files that break non webpack wrapped compiles
// tslint:disable-next-line:no-var-requires no-require-imports
const Module = require('module');

// Required for DS functional tests.
// tslint:disable-next-line:no-function-expression
(function () {
    const origRequire = Module.prototype.require;
    const _require = (context: any, filepath: any) => {
        return origRequire.call(context, filepath);
    };
    Module.prototype.require = function (filepath: string) {
        if (filepath.endsWith('.css') || filepath.endsWith('.svg')) {
            return '';
        }
        if (filepath.startsWith('expose-loader?')) {
            // Pull out the thing to expose
            const queryEnd = filepath.indexOf('!');
            if (queryEnd >= 0) {
                const query = filepath.substring('expose-loader?'.length, queryEnd);
                // tslint:disable-next-line:no-invalid-this
                (global as any)[query] = _require(this, filepath.substring(queryEnd + 1));
                return '';
            }
        }
        if (filepath.startsWith('slickgrid/slick.core')) {
            // Special case. This module sticks something into the global 'window' object.
            // tslint:disable-next-line:no-invalid-this
            const result = _require(this, filepath);

            // However it doesn't look in the 'window' object later. we have to move it to
            // the globals when in node.js
            if ((window as any).Slick) {
                (global as any).Slick = (window as any).Slick;
            }

            return result;
        }
        // tslint:disable-next-line:no-invalid-this
        return _require(this, filepath);
    };
})();

initialize();
