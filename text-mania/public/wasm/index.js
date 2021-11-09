
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
(function () {
    'use strict';

    const lAudioContext = (typeof AudioContext !== 'undefined' ? AudioContext : webkitAudioContext);
    let wasm;

    let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

    cachedTextDecoder.decode();

    let cachegetUint8Memory0 = null;
    function getUint8Memory0() {
        if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
            cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
        }
        return cachegetUint8Memory0;
    }

    function getStringFromWasm0(ptr, len) {
        return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
    }

    const heap = new Array(32).fill(undefined);

    heap.push(undefined, null, true, false);

    let heap_next = heap.length;

    function addHeapObject(obj) {
        if (heap_next === heap.length) heap.push(heap.length + 1);
        const idx = heap_next;
        heap_next = heap[idx];

        if (typeof(heap_next) !== 'number') throw new Error('corrupt heap');

        heap[idx] = obj;
        return idx;
    }

    function getObject(idx) { return heap[idx]; }

    function dropObject(idx) {
        if (idx < 36) return;
        heap[idx] = heap_next;
        heap_next = idx;
    }

    function takeObject(idx) {
        const ret = getObject(idx);
        dropObject(idx);
        return ret;
    }

    function _assertBoolean(n) {
        if (typeof(n) !== 'boolean') {
            throw new Error('expected a boolean argument');
        }
    }

    function isLikeNone(x) {
        return x === undefined || x === null;
    }

    function _assertNum(n) {
        if (typeof(n) !== 'number') throw new Error('expected a number argument');
    }

    let cachegetFloat64Memory0 = null;
    function getFloat64Memory0() {
        if (cachegetFloat64Memory0 === null || cachegetFloat64Memory0.buffer !== wasm.memory.buffer) {
            cachegetFloat64Memory0 = new Float64Array(wasm.memory.buffer);
        }
        return cachegetFloat64Memory0;
    }

    let cachegetInt32Memory0 = null;
    function getInt32Memory0() {
        if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.memory.buffer) {
            cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
        }
        return cachegetInt32Memory0;
    }

    let WASM_VECTOR_LEN = 0;

    let cachedTextEncoder = new TextEncoder('utf-8');

    const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
        ? function (arg, view) {
        return cachedTextEncoder.encodeInto(arg, view);
    }
        : function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    });

    function passStringToWasm0(arg, malloc, realloc) {

        if (typeof(arg) !== 'string') throw new Error('expected a string argument');

        if (realloc === undefined) {
            const buf = cachedTextEncoder.encode(arg);
            const ptr = malloc(buf.length);
            getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
            WASM_VECTOR_LEN = buf.length;
            return ptr;
        }

        let len = arg.length;
        let ptr = malloc(len);

        const mem = getUint8Memory0();

        let offset = 0;

        for (; offset < len; offset++) {
            const code = arg.charCodeAt(offset);
            if (code > 0x7F) break;
            mem[ptr + offset] = code;
        }

        if (offset !== len) {
            if (offset !== 0) {
                arg = arg.slice(offset);
            }
            ptr = realloc(ptr, len, len = offset + arg.length * 3);
            const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
            const ret = encodeString(arg, view);
            if (ret.read !== arg.length) throw new Error('failed to pass whole string');
            offset += ret.written;
        }

        WASM_VECTOR_LEN = offset;
        return ptr;
    }

    function debugString(val) {
        // primitive types
        const type = typeof val;
        if (type == 'number' || type == 'boolean' || val == null) {
            return  `${val}`;
        }
        if (type == 'string') {
            return `"${val}"`;
        }
        if (type == 'symbol') {
            const description = val.description;
            if (description == null) {
                return 'Symbol';
            } else {
                return `Symbol(${description})`;
            }
        }
        if (type == 'function') {
            const name = val.name;
            if (typeof name == 'string' && name.length > 0) {
                return `Function(${name})`;
            } else {
                return 'Function';
            }
        }
        // objects
        if (Array.isArray(val)) {
            const length = val.length;
            let debug = '[';
            if (length > 0) {
                debug += debugString(val[0]);
            }
            for(let i = 1; i < length; i++) {
                debug += ', ' + debugString(val[i]);
            }
            debug += ']';
            return debug;
        }
        // Test for built-in
        const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
        let className;
        if (builtInMatches.length > 1) {
            className = builtInMatches[1];
        } else {
            // Failed to match the standard '[object ClassName]'
            return toString.call(val);
        }
        if (className == 'Object') {
            // we're a user defined class or Object
            // JSON.stringify avoids problems with cycles, and is generally much
            // easier than looping through ownProperties of `val`.
            try {
                return 'Object(' + JSON.stringify(val) + ')';
            } catch (_) {
                return 'Object';
            }
        }
        // errors
        if (val instanceof Error) {
            return `${val.name}: ${val.message}\n${val.stack}`;
        }
        // TODO we could test for more things here, like `Set`s and `Map`s.
        return className;
    }

    function makeMutClosure(arg0, arg1, dtor, f) {
        const state = { a: arg0, b: arg1, cnt: 1, dtor };
        const real = (...args) => {
            // First up with a closure we increment the internal reference
            // count. This ensures that the Rust closure environment won't
            // be deallocated while we're invoking it.
            state.cnt++;
            const a = state.a;
            state.a = 0;
            try {
                return f(a, state.b, ...args);
            } finally {
                if (--state.cnt === 0) {
                    wasm.__wbindgen_export_2.get(state.dtor)(a, state.b);

                } else {
                    state.a = a;
                }
            }
        };
        real.original = state;

        return real;
    }

    function logError(f) {
        return function () {
            try {
                return f.apply(this, arguments);

            } catch (e) {
                let error = (function () {
                    try {
                        return e instanceof Error ? `${e.message}\n\nStack:\n${e.stack}` : e.toString();
                    } catch(_) {
                        return "<failed to stringify thrown value>";
                    }
                }());
                console.error("wasm-bindgen: imported JS function that was not marked as `catch` threw an error:", error);
                throw e;
            }
        };
    }

    let stack_pointer = 32;

    function addBorrowedObject(obj) {
        if (stack_pointer == 1) throw new Error('out of js stack');
        heap[--stack_pointer] = obj;
        return stack_pointer;
    }
    function __wbg_adapter_28(arg0, arg1, arg2) {
        try {
            _assertNum(arg0);
            _assertNum(arg1);
            wasm._dyn_core__ops__function__FnMut___A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__hc3e37cda43eed15b(arg0, arg1, addBorrowedObject(arg2));
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }

    function __wbg_adapter_31(arg0, arg1, arg2) {
        _assertNum(arg0);
        _assertNum(arg1);
        wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__hf6da61a90074298a(arg0, arg1, arg2);
    }

    function __wbg_adapter_34(arg0, arg1) {
        _assertNum(arg0);
        _assertNum(arg1);
        wasm._dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h7e565087b283797f(arg0, arg1);
    }

    function __wbg_adapter_37(arg0, arg1, arg2) {
        _assertNum(arg0);
        _assertNum(arg1);
        wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h7f7824707ee18402(arg0, arg1, addHeapObject(arg2));
    }

    function handleError(f) {
        return function () {
            try {
                return f.apply(this, arguments);

            } catch (e) {
                wasm.__wbindgen_exn_store(addHeapObject(e));
            }
        };
    }

    function getArrayU8FromWasm0(ptr, len) {
        return getUint8Memory0().subarray(ptr / 1, ptr / 1 + len);
    }

    let cachegetFloat32Memory0 = null;
    function getFloat32Memory0() {
        if (cachegetFloat32Memory0 === null || cachegetFloat32Memory0.buffer !== wasm.memory.buffer) {
            cachegetFloat32Memory0 = new Float32Array(wasm.memory.buffer);
        }
        return cachegetFloat32Memory0;
    }

    function getArrayF32FromWasm0(ptr, len) {
        return getFloat32Memory0().subarray(ptr / 4, ptr / 4 + len);
    }

    async function load(module, imports) {
        if (typeof Response === 'function' && module instanceof Response) {

            if (typeof WebAssembly.instantiateStreaming === 'function') {
                try {
                    return await WebAssembly.instantiateStreaming(module, imports);

                } catch (e) {
                    if (module.headers.get('Content-Type') != 'application/wasm') {
                        console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                    } else {
                        throw e;
                    }
                }
            }

            const bytes = await module.arrayBuffer();
            return await WebAssembly.instantiate(bytes, imports);

        } else {

            const instance = await WebAssembly.instantiate(module, imports);

            if (instance instanceof WebAssembly.Instance) {
                return { instance, module };

            } else {
                return instance;
            }
        }
    }

    async function init(input) {
        if (typeof input === 'undefined') {
            input = (document.currentScript && document.currentScript.src || new URL('index.js', document.baseURI).href).replace(/\.js$/, '_bg.wasm');
        }
        const imports = {};
        imports.wbg = {};
        imports.wbg.__wbg_load_777787adde847cec = logError(function(arg0) {
            var ret = getObject(arg0).load();
            return addHeapObject(ret);
        });
        imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
            var ret = getStringFromWasm0(arg0, arg1);
            return addHeapObject(ret);
        };
        imports.wbg.__wbindgen_object_clone_ref = function(arg0) {
            var ret = getObject(arg0);
            return addHeapObject(ret);
        };
        imports.wbg.__wbindgen_cb_drop = function(arg0) {
            const obj = takeObject(arg0).original;
            if (obj.cnt-- == 1) {
                obj.a = 0;
                return true;
            }
            var ret = false;
            _assertBoolean(ret);
            return ret;
        };
        imports.wbg.__wbg_new_935891d619fcc1e7 = logError(function(arg0, arg1) {
            var ret = new FontFaceObserver(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        });
        imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
            takeObject(arg0);
        };
        imports.wbg.__wbg_error_4bb6c2a97407129a = logError(function(arg0, arg1) {
            try {
                console.error(getStringFromWasm0(arg0, arg1));
            } finally {
                wasm.__wbindgen_free(arg0, arg1);
            }
        });
        imports.wbg.__wbg_new_59cb74e423758ede = logError(function() {
            var ret = new Error();
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_stack_558ba5917b466edd = logError(function(arg0, arg1) {
            var ret = getObject(arg1).stack;
            var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            getInt32Memory0()[arg0 / 4 + 1] = len0;
            getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        });
        imports.wbg.__wbg_self_1c83eb4471d9eb9b = handleError(function() {
            var ret = self.self;
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_msCrypto_679be765111ba775 = logError(function(arg0) {
            var ret = getObject(arg0).msCrypto;
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_crypto_c12f14e810edcaa2 = logError(function(arg0) {
            var ret = getObject(arg0).crypto;
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_getRandomValues_05a60bf171bfc2be = logError(function(arg0) {
            var ret = getObject(arg0).getRandomValues;
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_getRandomValues_3ac1b33c90b52596 = logError(function(arg0, arg1, arg2) {
            getObject(arg0).getRandomValues(getArrayU8FromWasm0(arg1, arg2));
        });
        imports.wbg.__wbg_randomFillSync_6f956029658662ec = logError(function(arg0, arg1, arg2) {
            getObject(arg0).randomFillSync(getArrayU8FromWasm0(arg1, arg2));
        });
        imports.wbg.__wbg_static_accessor_MODULE_abf5ae284bffdf45 = logError(function() {
            var ret = module;
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_require_5b2b5b594d809d9f = logError(function(arg0, arg1, arg2) {
            var ret = getObject(arg0).require(getStringFromWasm0(arg1, arg2));
            return addHeapObject(ret);
        });
        imports.wbg.__wbindgen_is_undefined = function(arg0) {
            var ret = getObject(arg0) === undefined;
            _assertBoolean(ret);
            return ret;
        };
        imports.wbg.__wbindgen_number_new = function(arg0) {
            var ret = arg0;
            return addHeapObject(ret);
        };
        imports.wbg.__wbg_new_68adb0d58759a4ed = logError(function() {
            var ret = new Object();
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_set_2e79e744454afade = logError(function(arg0, arg1, arg2) {
            getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
        });
        imports.wbg.__wbg_instanceof_WebGl2RenderingContext_836e46859b2055b5 = logError(function(arg0) {
            var ret = getObject(arg0) instanceof WebGL2RenderingContext;
            _assertBoolean(ret);
            return ret;
        });
        imports.wbg.__wbg_canvas_c3b5bcef078680ac = logError(function(arg0) {
            var ret = getObject(arg0).canvas;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        });
        imports.wbg.__wbg_drawingBufferWidth_c0e5fe51bf4108ba = logError(function(arg0) {
            var ret = getObject(arg0).drawingBufferWidth;
            _assertNum(ret);
            return ret;
        });
        imports.wbg.__wbg_drawingBufferHeight_1fdad6a5afcf2d04 = logError(function(arg0) {
            var ret = getObject(arg0).drawingBufferHeight;
            _assertNum(ret);
            return ret;
        });
        imports.wbg.__wbg_bindVertexArray_8bb02f8645a29e05 = logError(function(arg0, arg1) {
            getObject(arg0).bindVertexArray(getObject(arg1));
        });
        imports.wbg.__wbg_blitFramebuffer_d13f550828fdb0e9 = logError(function(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
            getObject(arg0).blitFramebuffer(arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9 >>> 0, arg10 >>> 0);
        });
        imports.wbg.__wbg_bufferData_eb6e92d39c5a153c = logError(function(arg0, arg1, arg2, arg3) {
            getObject(arg0).bufferData(arg1 >>> 0, getObject(arg2), arg3 >>> 0);
        });
        imports.wbg.__wbg_bufferData_a49730b56e5517bc = logError(function(arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).bufferData(arg1 >>> 0, getArrayU8FromWasm0(arg2, arg3), arg4 >>> 0);
        });
        imports.wbg.__wbg_createVertexArray_fd08eb7c8f8e86a3 = logError(function(arg0) {
            var ret = getObject(arg0).createVertexArray();
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        });
        imports.wbg.__wbg_getActiveUniformBlockName_9307faa56eb4763e = logError(function(arg0, arg1, arg2, arg3) {
            var ret = getObject(arg1).getActiveUniformBlockName(getObject(arg2), arg3 >>> 0);
            var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            getInt32Memory0()[arg0 / 4 + 1] = len0;
            getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        });
        imports.wbg.__wbg_getActiveUniformBlockParameter_6f20ffcfa5fe017f = handleError(function(arg0, arg1, arg2, arg3) {
            var ret = getObject(arg0).getActiveUniformBlockParameter(getObject(arg1), arg2 >>> 0, arg3 >>> 0);
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_getActiveUniforms_fbb1347cfd0f8895 = logError(function(arg0, arg1, arg2, arg3) {
            var ret = getObject(arg0).getActiveUniforms(getObject(arg1), getObject(arg2), arg3 >>> 0);
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_getUniformBlockIndex_ffda6282b14d7087 = logError(function(arg0, arg1, arg2, arg3) {
            var ret = getObject(arg0).getUniformBlockIndex(getObject(arg1), getStringFromWasm0(arg2, arg3));
            _assertNum(ret);
            return ret;
        });
        imports.wbg.__wbg_renderbufferStorageMultisample_e2e5abdd40c801c8 = logError(function(arg0, arg1, arg2, arg3, arg4, arg5) {
            getObject(arg0).renderbufferStorageMultisample(arg1 >>> 0, arg2, arg3 >>> 0, arg4, arg5);
        });
        imports.wbg.__wbg_texImage2D_60e39e2896a453d6 = handleError(function(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
            getObject(arg0).texImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, getObject(arg9));
        });
        imports.wbg.__wbg_texImage2D_85265af79b95fcf2 = handleError(function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
            getObject(arg0).texImage2D(arg1 >>> 0, arg2, arg3, arg4 >>> 0, arg5 >>> 0, getObject(arg6));
        });
        imports.wbg.__wbg_texImage2D_9e8b631ff0bf6320 = handleError(function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
            getObject(arg0).texImage2D(arg1 >>> 0, arg2, arg3, arg4 >>> 0, arg5 >>> 0, getObject(arg6));
        });
        imports.wbg.__wbg_texImage2D_f17470a3f38f5e3d = handleError(function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
            getObject(arg0).texImage2D(arg1 >>> 0, arg2, arg3, arg4 >>> 0, arg5 >>> 0, getObject(arg6));
        });
        imports.wbg.__wbg_texImage2D_cf410cf651f45662 = handleError(function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
            getObject(arg0).texImage2D(arg1 >>> 0, arg2, arg3, arg4 >>> 0, arg5 >>> 0, getObject(arg6));
        });
        imports.wbg.__wbg_texImage2D_c985f0776fbf974d = handleError(function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
            getObject(arg0).texImage2D(arg1 >>> 0, arg2, arg3, arg4 >>> 0, arg5 >>> 0, getObject(arg6));
        });
        imports.wbg.__wbg_texImage3D_fdb3c7acd56e4b0c = handleError(function(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9, arg10) {
            getObject(arg0).texImage3D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7, arg8 >>> 0, arg9 >>> 0, getObject(arg10));
        });
        imports.wbg.__wbg_uniform1fv_93a60284c15dcd64 = logError(function(arg0, arg1, arg2, arg3) {
            getObject(arg0).uniform1fv(getObject(arg1), getArrayF32FromWasm0(arg2, arg3));
        });
        imports.wbg.__wbg_uniform2fv_501f16fc3889b338 = logError(function(arg0, arg1, arg2, arg3) {
            getObject(arg0).uniform2fv(getObject(arg1), getArrayF32FromWasm0(arg2, arg3));
        });
        imports.wbg.__wbg_uniform3fv_e63518dafee7c4e2 = logError(function(arg0, arg1, arg2, arg3) {
            getObject(arg0).uniform3fv(getObject(arg1), getArrayF32FromWasm0(arg2, arg3));
        });
        imports.wbg.__wbg_uniform4fv_25cc9819e7933d2b = logError(function(arg0, arg1, arg2, arg3) {
            getObject(arg0).uniform4fv(getObject(arg1), getArrayF32FromWasm0(arg2, arg3));
        });
        imports.wbg.__wbg_uniformBlockBinding_762aa6c06bda445f = logError(function(arg0, arg1, arg2, arg3) {
            getObject(arg0).uniformBlockBinding(getObject(arg1), arg2 >>> 0, arg3 >>> 0);
        });
        imports.wbg.__wbg_uniformMatrix2fv_309b3ff9c01def66 = logError(function(arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).uniformMatrix2fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
        });
        imports.wbg.__wbg_uniformMatrix3fv_4c40c5b08807ce96 = logError(function(arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).uniformMatrix3fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
        });
        imports.wbg.__wbg_uniformMatrix4fv_7a754e2c7af71be4 = logError(function(arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).uniformMatrix4fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
        });
        imports.wbg.__wbg_activeTexture_9d96cecdacbe1a7d = logError(function(arg0, arg1) {
            getObject(arg0).activeTexture(arg1 >>> 0);
        });
        imports.wbg.__wbg_attachShader_1924aa4a49a31418 = logError(function(arg0, arg1, arg2) {
            getObject(arg0).attachShader(getObject(arg1), getObject(arg2));
        });
        imports.wbg.__wbg_bindAttribLocation_3cf80d1673eb27d7 = logError(function(arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).bindAttribLocation(getObject(arg1), arg2 >>> 0, getStringFromWasm0(arg3, arg4));
        });
        imports.wbg.__wbg_bindBuffer_6a7df3ea760a2c83 = logError(function(arg0, arg1, arg2) {
            getObject(arg0).bindBuffer(arg1 >>> 0, getObject(arg2));
        });
        imports.wbg.__wbg_bindFramebuffer_9e33974abcd4cff4 = logError(function(arg0, arg1, arg2) {
            getObject(arg0).bindFramebuffer(arg1 >>> 0, getObject(arg2));
        });
        imports.wbg.__wbg_bindRenderbuffer_7a9383e4cc727ec6 = logError(function(arg0, arg1, arg2) {
            getObject(arg0).bindRenderbuffer(arg1 >>> 0, getObject(arg2));
        });
        imports.wbg.__wbg_bindTexture_a03a7320443c8a4d = logError(function(arg0, arg1, arg2) {
            getObject(arg0).bindTexture(arg1 >>> 0, getObject(arg2));
        });
        imports.wbg.__wbg_blendFunc_2dc4d7ca3062653e = logError(function(arg0, arg1, arg2) {
            getObject(arg0).blendFunc(arg1 >>> 0, arg2 >>> 0);
        });
        imports.wbg.__wbg_checkFramebufferStatus_39a400b64677a162 = logError(function(arg0, arg1) {
            var ret = getObject(arg0).checkFramebufferStatus(arg1 >>> 0);
            _assertNum(ret);
            return ret;
        });
        imports.wbg.__wbg_clear_256f95c85e2d5b47 = logError(function(arg0, arg1) {
            getObject(arg0).clear(arg1 >>> 0);
        });
        imports.wbg.__wbg_clearColor_5941bfbf220e0165 = logError(function(arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).clearColor(arg1, arg2, arg3, arg4);
        });
        imports.wbg.__wbg_compileShader_18c92b61889a02b6 = logError(function(arg0, arg1) {
            getObject(arg0).compileShader(getObject(arg1));
        });
        imports.wbg.__wbg_createBuffer_7fadf474857a2122 = logError(function(arg0) {
            var ret = getObject(arg0).createBuffer();
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        });
        imports.wbg.__wbg_createFramebuffer_1b4177e55ee28baa = logError(function(arg0) {
            var ret = getObject(arg0).createFramebuffer();
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        });
        imports.wbg.__wbg_createProgram_8d6f13ab051f686a = logError(function(arg0) {
            var ret = getObject(arg0).createProgram();
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        });
        imports.wbg.__wbg_createRenderbuffer_c2f2b86d9f047325 = logError(function(arg0) {
            var ret = getObject(arg0).createRenderbuffer();
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        });
        imports.wbg.__wbg_createShader_bc89b940e81883dd = logError(function(arg0, arg1) {
            var ret = getObject(arg0).createShader(arg1 >>> 0);
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        });
        imports.wbg.__wbg_createTexture_e172faa9d6a303c1 = logError(function(arg0) {
            var ret = getObject(arg0).createTexture();
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        });
        imports.wbg.__wbg_deleteProgram_c33ed33d83373050 = logError(function(arg0, arg1) {
            getObject(arg0).deleteProgram(getObject(arg1));
        });
        imports.wbg.__wbg_deleteShader_80c56945efc9e910 = logError(function(arg0, arg1) {
            getObject(arg0).deleteShader(getObject(arg1));
        });
        imports.wbg.__wbg_depthMask_aa1c19372a664ed8 = logError(function(arg0, arg1) {
            getObject(arg0).depthMask(arg1 !== 0);
        });
        imports.wbg.__wbg_detachShader_c900c4b4564b9fbd = logError(function(arg0, arg1, arg2) {
            getObject(arg0).detachShader(getObject(arg1), getObject(arg2));
        });
        imports.wbg.__wbg_disable_edb7c38f0be19a38 = logError(function(arg0, arg1) {
            getObject(arg0).disable(arg1 >>> 0);
        });
        imports.wbg.__wbg_drawArrays_3a2dad7dfe033972 = logError(function(arg0, arg1, arg2, arg3) {
            getObject(arg0).drawArrays(arg1 >>> 0, arg2, arg3);
        });
        imports.wbg.__wbg_drawElements_0376b48b08ac34a7 = logError(function(arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).drawElements(arg1 >>> 0, arg2, arg3 >>> 0, arg4);
        });
        imports.wbg.__wbg_enable_28a715ea384ce803 = logError(function(arg0, arg1) {
            getObject(arg0).enable(arg1 >>> 0);
        });
        imports.wbg.__wbg_enableVertexAttribArray_fafa57fbcd454495 = logError(function(arg0, arg1) {
            getObject(arg0).enableVertexAttribArray(arg1 >>> 0);
        });
        imports.wbg.__wbg_framebufferRenderbuffer_943e7c72d659ce60 = logError(function(arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).framebufferRenderbuffer(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, getObject(arg4));
        });
        imports.wbg.__wbg_framebufferTexture2D_e7ccac9b20c947d3 = logError(function(arg0, arg1, arg2, arg3, arg4, arg5) {
            getObject(arg0).framebufferTexture2D(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, getObject(arg4), arg5);
        });
        imports.wbg.__wbg_generateMipmap_e4fa2d997c6d5f54 = logError(function(arg0, arg1) {
            getObject(arg0).generateMipmap(arg1 >>> 0);
        });
        imports.wbg.__wbg_getActiveAttrib_5d4589560031c141 = logError(function(arg0, arg1, arg2) {
            var ret = getObject(arg0).getActiveAttrib(getObject(arg1), arg2 >>> 0);
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        });
        imports.wbg.__wbg_getActiveUniform_f736b9cae4dcb0b0 = logError(function(arg0, arg1, arg2) {
            var ret = getObject(arg0).getActiveUniform(getObject(arg1), arg2 >>> 0);
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        });
        imports.wbg.__wbg_getAttribLocation_67060fc7496f8cf6 = logError(function(arg0, arg1, arg2, arg3) {
            var ret = getObject(arg0).getAttribLocation(getObject(arg1), getStringFromWasm0(arg2, arg3));
            _assertNum(ret);
            return ret;
        });
        imports.wbg.__wbg_getParameter_d680f5c6d50aba30 = handleError(function(arg0, arg1) {
            var ret = getObject(arg0).getParameter(arg1 >>> 0);
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_getProgramInfoLog_221be6701c636176 = logError(function(arg0, arg1, arg2) {
            var ret = getObject(arg1).getProgramInfoLog(getObject(arg2));
            var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            getInt32Memory0()[arg0 / 4 + 1] = len0;
            getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        });
        imports.wbg.__wbg_getProgramParameter_d2854e9210e85494 = logError(function(arg0, arg1, arg2) {
            var ret = getObject(arg0).getProgramParameter(getObject(arg1), arg2 >>> 0);
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_getShaderInfoLog_1071a8467544f43b = logError(function(arg0, arg1, arg2) {
            var ret = getObject(arg1).getShaderInfoLog(getObject(arg2));
            var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            getInt32Memory0()[arg0 / 4 + 1] = len0;
            getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        });
        imports.wbg.__wbg_getShaderParameter_f942fc2044b16ba0 = logError(function(arg0, arg1, arg2) {
            var ret = getObject(arg0).getShaderParameter(getObject(arg1), arg2 >>> 0);
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_getUniformLocation_d6e4f5bee8a84579 = logError(function(arg0, arg1, arg2, arg3) {
            var ret = getObject(arg0).getUniformLocation(getObject(arg1), getStringFromWasm0(arg2, arg3));
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        });
        imports.wbg.__wbg_linkProgram_a5fd2d3a29f244c0 = logError(function(arg0, arg1) {
            getObject(arg0).linkProgram(getObject(arg1));
        });
        imports.wbg.__wbg_pixelStorei_1312089c29e9a435 = logError(function(arg0, arg1, arg2) {
            getObject(arg0).pixelStorei(arg1 >>> 0, arg2);
        });
        imports.wbg.__wbg_shaderSource_1804c02eec34a9c2 = logError(function(arg0, arg1, arg2, arg3) {
            getObject(arg0).shaderSource(getObject(arg1), getStringFromWasm0(arg2, arg3));
        });
        imports.wbg.__wbg_texParameteri_f3be7a9c7fc03dac = logError(function(arg0, arg1, arg2, arg3) {
            getObject(arg0).texParameteri(arg1 >>> 0, arg2 >>> 0, arg3);
        });
        imports.wbg.__wbg_uniform1f_4718a6fd4ea1bc6c = logError(function(arg0, arg1, arg2) {
            getObject(arg0).uniform1f(getObject(arg1), arg2);
        });
        imports.wbg.__wbg_uniform1i_a34df477d48c37e2 = logError(function(arg0, arg1, arg2) {
            getObject(arg0).uniform1i(getObject(arg1), arg2);
        });
        imports.wbg.__wbg_uniform2f_3bcd4901604aedef = logError(function(arg0, arg1, arg2, arg3) {
            getObject(arg0).uniform2f(getObject(arg1), arg2, arg3);
        });
        imports.wbg.__wbg_uniform3f_f6756fdfc5833abe = logError(function(arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).uniform3f(getObject(arg1), arg2, arg3, arg4);
        });
        imports.wbg.__wbg_uniform4f_1a2d24f9cb947d76 = logError(function(arg0, arg1, arg2, arg3, arg4, arg5) {
            getObject(arg0).uniform4f(getObject(arg1), arg2, arg3, arg4, arg5);
        });
        imports.wbg.__wbg_useProgram_9523fdac78894a60 = logError(function(arg0, arg1) {
            getObject(arg0).useProgram(getObject(arg1));
        });
        imports.wbg.__wbg_vertexAttribPointer_4d034937d44e9bb2 = logError(function(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
            getObject(arg0).vertexAttribPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4 !== 0, arg5, arg6);
        });
        imports.wbg.__wbg_viewport_30b14839e31d0b61 = logError(function(arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).viewport(arg1, arg2, arg3, arg4);
        });
        imports.wbg.__wbg_instanceof_Window_adf3196bdc02b386 = logError(function(arg0) {
            var ret = getObject(arg0) instanceof Window;
            _assertBoolean(ret);
            return ret;
        });
        imports.wbg.__wbg_document_6cc8d0b87c0a99b9 = logError(function(arg0) {
            var ret = getObject(arg0).document;
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        });
        imports.wbg.__wbg_location_9b924f46d7090431 = logError(function(arg0) {
            var ret = getObject(arg0).location;
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_innerWidth_60241abd729ed26f = handleError(function(arg0) {
            var ret = getObject(arg0).innerWidth;
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_innerHeight_2f860a67225f1fbd = handleError(function(arg0) {
            var ret = getObject(arg0).innerHeight;
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_cancelAnimationFrame_7f3ba4191e67c86b = handleError(function(arg0, arg1) {
            getObject(arg0).cancelAnimationFrame(arg1);
        });
        imports.wbg.__wbg_requestAnimationFrame_89935c9d6ac25d2f = handleError(function(arg0, arg1) {
            var ret = getObject(arg0).requestAnimationFrame(getObject(arg1));
            _assertNum(ret);
            return ret;
        });
        imports.wbg.__wbg_fetch_1893f81c58855a39 = logError(function(arg0, arg1, arg2) {
            var ret = getObject(arg0).fetch(getObject(arg1), getObject(arg2));
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_signal_0017288388f0d141 = logError(function(arg0) {
            var ret = getObject(arg0).signal;
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_new_a82a2c2e1595c56f = handleError(function() {
            var ret = new AbortController();
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_abort_bedcd7330ee18c55 = logError(function(arg0) {
            getObject(arg0).abort();
        });
        imports.wbg.__wbg_connect_a4e3fd3dce194b2c = handleError(function(arg0, arg1) {
            var ret = getObject(arg0).connect(getObject(arg1));
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_addEventListener_f0baf69c9c7425c9 = handleError(function(arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).addEventListener(getStringFromWasm0(arg1, arg2), getObject(arg3), getObject(arg4));
        });
        imports.wbg.__wbg_removeEventListener_9ffcd175e0916270 = handleError(function(arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).removeEventListener(getStringFromWasm0(arg1, arg2), getObject(arg3), arg4 !== 0);
        });
        imports.wbg.__wbg_value_bff6f7ef104e077a = logError(function(arg0, arg1) {
            var ret = getObject(arg1).value;
            var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            getInt32Memory0()[arg0 / 4 + 1] = len0;
            getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        });
        imports.wbg.__wbg_size_2af4563243a143c3 = logError(function(arg0) {
            var ret = getObject(arg0).size;
            _assertNum(ret);
            return ret;
        });
        imports.wbg.__wbg_type_43500effee613c7d = logError(function(arg0) {
            var ret = getObject(arg0).type;
            _assertNum(ret);
            return ret;
        });
        imports.wbg.__wbg_name_27b4012d3621bcc1 = logError(function(arg0, arg1) {
            var ret = getObject(arg1).name;
            var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            getInt32Memory0()[arg0 / 4 + 1] = len0;
            getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        });
        imports.wbg.__wbg_instanceof_HtmlCanvasElement_4f5b5ec6cd53ccf3 = logError(function(arg0) {
            var ret = getObject(arg0) instanceof HTMLCanvasElement;
            _assertBoolean(ret);
            return ret;
        });
        imports.wbg.__wbg_width_a22f9855caa54b53 = logError(function(arg0) {
            var ret = getObject(arg0).width;
            _assertNum(ret);
            return ret;
        });
        imports.wbg.__wbg_setwidth_5f26a8ba9dbfa0d0 = logError(function(arg0, arg1) {
            getObject(arg0).width = arg1 >>> 0;
        });
        imports.wbg.__wbg_height_9a404a6b3c61c7ef = logError(function(arg0) {
            var ret = getObject(arg0).height;
            _assertNum(ret);
            return ret;
        });
        imports.wbg.__wbg_setheight_70f62727aa9383c2 = logError(function(arg0, arg1) {
            getObject(arg0).height = arg1 >>> 0;
        });
        imports.wbg.__wbg_getContext_37ca0870acb096d9 = handleError(function(arg0, arg1, arg2) {
            var ret = getObject(arg0).getContext(getStringFromWasm0(arg1, arg2));
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        });
        imports.wbg.__wbg_getContext_e7747f5b022c18e9 = handleError(function(arg0, arg1, arg2, arg3) {
            var ret = getObject(arg0).getContext(getStringFromWasm0(arg1, arg2), getObject(arg3));
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        });
        imports.wbg.__wbg_instanceof_KeyboardEvent_f3e957ac7e5a3f7d = logError(function(arg0) {
            var ret = getObject(arg0) instanceof KeyboardEvent;
            _assertBoolean(ret);
            return ret;
        });
        imports.wbg.__wbg_code_c3b28f37b4149e68 = logError(function(arg0, arg1) {
            var ret = getObject(arg1).code;
            var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            getInt32Memory0()[arg0 / 4 + 1] = len0;
            getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        });
        imports.wbg.__wbg_setfillStyle_2da87acf76dcbbcb = logError(function(arg0, arg1) {
            getObject(arg0).fillStyle = getObject(arg1);
        });
        imports.wbg.__wbg_setfont_7fb9fae174edc509 = logError(function(arg0, arg1, arg2) {
            getObject(arg0).font = getStringFromWasm0(arg1, arg2);
        });
        imports.wbg.__wbg_settextAlign_ef9d091f8d27eff3 = logError(function(arg0, arg1, arg2) {
            getObject(arg0).textAlign = getStringFromWasm0(arg1, arg2);
        });
        imports.wbg.__wbg_settextBaseline_c2a0520f9cd40851 = logError(function(arg0, arg1, arg2) {
            getObject(arg0).textBaseline = getStringFromWasm0(arg1, arg2);
        });
        imports.wbg.__wbg_createLinearGradient_1a10d1a74c784b4a = logError(function(arg0, arg1, arg2, arg3, arg4) {
            var ret = getObject(arg0).createLinearGradient(arg1, arg2, arg3, arg4);
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_fillRect_e9ad0b5dde70ab3b = logError(function(arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).fillRect(arg1, arg2, arg3, arg4);
        });
        imports.wbg.__wbg_fillText_bd212fc8e99ff788 = handleError(function(arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).fillText(getStringFromWasm0(arg1, arg2), arg3, arg4);
        });
        imports.wbg.__wbg_addColorStop_92c4ccb7ebacfe54 = handleError(function(arg0, arg1, arg2, arg3) {
            getObject(arg0).addColorStop(arg1, getStringFromWasm0(arg2, arg3));
        });
        imports.wbg.__wbg_new_964b4876f78388bf = handleError(function(arg0, arg1) {
            var ret = new Event(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_setsrc_4e562fe2dd3f545a = logError(function(arg0, arg1, arg2) {
            getObject(arg0).src = getStringFromWasm0(arg1, arg2);
        });
        imports.wbg.__wbg_setcrossOrigin_a309b136be1bfc64 = logError(function(arg0, arg1, arg2) {
            getObject(arg0).crossOrigin = arg1 === 0 ? undefined : getStringFromWasm0(arg1, arg2);
        });
        imports.wbg.__wbg_width_c44955d492197e44 = logError(function(arg0) {
            var ret = getObject(arg0).width;
            _assertNum(ret);
            return ret;
        });
        imports.wbg.__wbg_height_4e87e628e5b7c122 = logError(function(arg0) {
            var ret = getObject(arg0).height;
            _assertNum(ret);
            return ret;
        });
        imports.wbg.__wbg_new_6c05171898e5da27 = handleError(function() {
            var ret = new Image();
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_setProperty_42eabadfcd7d6199 = handleError(function(arg0, arg1, arg2, arg3, arg4) {
            getObject(arg0).setProperty(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        });
        imports.wbg.__wbg_origin_f7f7254564762bea = handleError(function(arg0, arg1) {
            var ret = getObject(arg1).origin;
            var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            getInt32Memory0()[arg0 / 4 + 1] = len0;
            getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        });
        imports.wbg.__wbg_ok_7f500542a5af3b60 = logError(function(arg0) {
            var ret = getObject(arg0).ok;
            _assertBoolean(ret);
            return ret;
        });
        imports.wbg.__wbg_text_966d07536ca6ccdc = handleError(function(arg0) {
            var ret = getObject(arg0).text();
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_instanceof_MouseEvent_2d536cebe676085c = logError(function(arg0) {
            var ret = getObject(arg0) instanceof MouseEvent;
            _assertBoolean(ret);
            return ret;
        });
        imports.wbg.__wbg_clientX_c1a2c3a6a07188a2 = logError(function(arg0) {
            var ret = getObject(arg0).clientX;
            _assertNum(ret);
            return ret;
        });
        imports.wbg.__wbg_clientY_090f8ba07f76875d = logError(function(arg0) {
            var ret = getObject(arg0).clientY;
            _assertNum(ret);
            return ret;
        });
        imports.wbg.__wbg_newwithoptions_41be7c668d35f694 = handleError(function(arg0, arg1) {
            var ret = new OscillatorNode(getObject(arg0), getObject(arg1));
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_start_b52cd19764c92efb = handleError(function(arg0) {
            getObject(arg0).start();
        });
        imports.wbg.__wbg_stop_7ddc0d901b61b8f3 = handleError(function(arg0, arg1) {
            getObject(arg0).stop(arg1);
        });
        imports.wbg.__wbg_origin_f887d256e07dcdf3 = logError(function(arg0, arg1) {
            var ret = getObject(arg1).origin;
            var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            getInt32Memory0()[arg0 / 4 + 1] = len0;
            getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        });
        imports.wbg.__wbg_new_047e1bd7ad812532 = handleError(function(arg0, arg1) {
            var ret = new URL(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_createElement_5bdf88a5af9f17c5 = handleError(function(arg0, arg1, arg2) {
            var ret = getObject(arg0).createElement(getStringFromWasm0(arg1, arg2));
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_getElementById_0cb6ad9511b1efc0 = logError(function(arg0, arg1, arg2) {
            var ret = getObject(arg0).getElementById(getStringFromWasm0(arg1, arg2));
            return isLikeNone(ret) ? 0 : addHeapObject(ret);
        });
        imports.wbg.__wbg_debug_d101e002eb92f20b = logError(function(arg0, arg1, arg2, arg3) {
            console.debug(getObject(arg0), getObject(arg1), getObject(arg2), getObject(arg3));
        });
        imports.wbg.__wbg_error_7f083efc6bc6752c = logError(function(arg0) {
            console.error(getObject(arg0));
        });
        imports.wbg.__wbg_error_cb872335132b1ef7 = logError(function(arg0, arg1, arg2, arg3) {
            console.error(getObject(arg0), getObject(arg1), getObject(arg2), getObject(arg3));
        });
        imports.wbg.__wbg_info_a25afde0ff8cd04a = logError(function(arg0, arg1, arg2, arg3) {
            console.info(getObject(arg0), getObject(arg1), getObject(arg2), getObject(arg3));
        });
        imports.wbg.__wbg_log_64f566ae90a6c43c = logError(function(arg0, arg1, arg2, arg3) {
            console.log(getObject(arg0), getObject(arg1), getObject(arg2), getObject(arg3));
        });
        imports.wbg.__wbg_warn_f632d7d3f55682b6 = logError(function(arg0, arg1, arg2, arg3) {
            console.warn(getObject(arg0), getObject(arg1), getObject(arg2), getObject(arg3));
        });
        imports.wbg.__wbg_destination_647daf47bfcda8af = logError(function(arg0) {
            var ret = getObject(arg0).destination;
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_currentTime_9790fc4a74b6d62f = logError(function(arg0) {
            var ret = getObject(arg0).currentTime;
            return ret;
        });
        imports.wbg.__wbg_new_c759b32bc33d4dfa = handleError(function() {
            var ret = new lAudioContext();
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_style_9a41d46c005f7596 = logError(function(arg0) {
            var ret = getObject(arg0).style;
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_setonload_ab35a7a2495b1678 = logError(function(arg0, arg1) {
            getObject(arg0).onload = getObject(arg1);
        });
        imports.wbg.__wbg_setonerror_b91169e64312f1fa = logError(function(arg0, arg1) {
            getObject(arg0).onerror = getObject(arg1);
        });
        imports.wbg.__wbg_newwithstr_394b800339828eb1 = handleError(function(arg0, arg1) {
            var ret = new Request(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_new_1192d65414040ad9 = logError(function(arg0, arg1) {
            var ret = new Error(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_newnoargs_f3b8a801d5d4b079 = logError(function(arg0, arg1) {
            var ret = new Function(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_call_8e95613cc6524977 = handleError(function(arg0, arg1) {
            var ret = getObject(arg0).call(getObject(arg1));
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_new_3e06d4f36713e4cb = logError(function() {
            var ret = new Object();
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_resolve_2529512c3bb73938 = logError(function(arg0) {
            var ret = Promise.resolve(getObject(arg0));
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_then_4a7a614abbbe6d81 = logError(function(arg0, arg1) {
            var ret = getObject(arg0).then(getObject(arg1));
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_then_3b7ac098cfda2fa5 = logError(function(arg0, arg1, arg2) {
            var ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_globalThis_b9277fc37e201fe5 = handleError(function() {
            var ret = globalThis.globalThis;
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_self_07b2f89e82ceb76d = handleError(function() {
            var ret = self.self;
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_window_ba85d88572adc0dc = handleError(function() {
            var ret = window.window;
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_global_e16303fe83e1d57f = handleError(function() {
            var ret = global.global;
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_new_978d50b11e5afc43 = logError(function(arg0) {
            var ret = new Uint32Array(getObject(arg0));
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_newwithbyteoffsetandlength_52b3c77a0f7c0b59 = logError(function(arg0, arg1, arg2) {
            var ret = new Uint32Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_length_e39ba2e60cae8cf9 = logError(function(arg0) {
            var ret = getObject(arg0).length;
            _assertNum(ret);
            return ret;
        });
        imports.wbg.__wbg_set_7a804f2a7a766d05 = logError(function(arg0, arg1, arg2) {
            getObject(arg0).set(getObject(arg1), arg2 >>> 0);
        });
        imports.wbg.__wbg_new_79f4487112eba5a7 = logError(function(arg0) {
            var ret = new Float32Array(getObject(arg0));
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_newwithbyteoffsetandlength_205200207c0c1946 = logError(function(arg0, arg1, arg2) {
            var ret = new Float32Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_length_4306a35ca4194f07 = logError(function(arg0) {
            var ret = getObject(arg0).length;
            _assertNum(ret);
            return ret;
        });
        imports.wbg.__wbg_set_b9d9b76f1c2eefec = logError(function(arg0, arg1, arg2) {
            getObject(arg0).set(getObject(arg1), arg2 >>> 0);
        });
        imports.wbg.__wbg_buffer_49131c283a06686f = logError(function(arg0) {
            var ret = getObject(arg0).buffer;
            return addHeapObject(ret);
        });
        imports.wbg.__wbg_set_304f2ec1a3ab3b79 = handleError(function(arg0, arg1, arg2) {
            var ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
            _assertBoolean(ret);
            return ret;
        });
        imports.wbg.__wbindgen_number_get = function(arg0, arg1) {
            const obj = getObject(arg1);
            var ret = typeof(obj) === 'number' ? obj : undefined;
            if (!isLikeNone(ret)) {
                _assertNum(ret);
            }
            getFloat64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? 0 : ret;
            getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
        };
        imports.wbg.__wbindgen_string_get = function(arg0, arg1) {
            const obj = getObject(arg1);
            var ret = typeof(obj) === 'string' ? obj : undefined;
            var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            getInt32Memory0()[arg0 / 4 + 1] = len0;
            getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        };
        imports.wbg.__wbindgen_boolean_get = function(arg0) {
            const v = getObject(arg0);
            var ret = typeof(v) === 'boolean' ? (v ? 1 : 0) : 2;
            _assertNum(ret);
            return ret;
        };
        imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
            var ret = debugString(getObject(arg1));
            var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len0 = WASM_VECTOR_LEN;
            getInt32Memory0()[arg0 / 4 + 1] = len0;
            getInt32Memory0()[arg0 / 4 + 0] = ptr0;
        };
        imports.wbg.__wbindgen_throw = function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        };
        imports.wbg.__wbindgen_rethrow = function(arg0) {
            throw takeObject(arg0);
        };
        imports.wbg.__wbindgen_memory = function() {
            var ret = wasm.memory;
            return addHeapObject(ret);
        };
        imports.wbg.__wbindgen_closure_wrapper4896 = logError(function(arg0, arg1, arg2) {
            var ret = makeMutClosure(arg0, arg1, 214, __wbg_adapter_28);
            return addHeapObject(ret);
        });
        imports.wbg.__wbindgen_closure_wrapper4898 = logError(function(arg0, arg1, arg2) {
            var ret = makeMutClosure(arg0, arg1, 212, __wbg_adapter_31);
            return addHeapObject(ret);
        });
        imports.wbg.__wbindgen_closure_wrapper15551 = logError(function(arg0, arg1, arg2) {
            var ret = makeMutClosure(arg0, arg1, 496, __wbg_adapter_34);
            return addHeapObject(ret);
        });
        imports.wbg.__wbindgen_closure_wrapper18115 = logError(function(arg0, arg1, arg2) {
            var ret = makeMutClosure(arg0, arg1, 531, __wbg_adapter_37);
            return addHeapObject(ret);
        });

        if (typeof input === 'string' || (typeof Request === 'function' && input instanceof Request) || (typeof URL === 'function' && input instanceof URL)) {
            input = fetch(input);
        }

        const { instance, module } = await load(await input, imports);

        wasm = instance.exports;
        init.__wbindgen_wasm_module = module;
        wasm.__wbindgen_start();
        return wasm;
    }

    init("wasm/assets/app-715a15d5.wasm").catch(console.error);

}());
//# sourceMappingURL=index.js.map
