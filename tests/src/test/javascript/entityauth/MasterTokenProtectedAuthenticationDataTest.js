/**
 * Copyright (c) 2015 Netflix, Inc.  All rights reserved.
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Master token protected entity authentication data unit tests.
 * 
 * @author Wesley Miaw <wmiaw@netflix.com>
 */
describe("MasterTokenProtectedAuthenticationData", function() {
    const MslEncoderFormat = require('../../../../../core/src/main/javascript/io/MslEncoderFormat.js');
    const EntityAuthenticationScheme = require('../../../../../core/src/main/javascript/entityauth/EntityAuthenticationScheme.js');
    const UnauthenticatedAuthenticationData = require('../../../../../core/src/main/javascript/entityauth/UnauthenticatedAuthenticationData.js');
    const MasterTokenProtectedAuthenticationData = require('../../../../../core/src/main/javascript/entityauth/MasterTokenProtectedAuthenticationData.js');
    const EntityAuthenticationData = require('../../../../../core/src/main/javascript/entityauth/EntityAuthenticationData.js');
    const MslObject = require('../../../../../core/src/main/javascript/io/MslObject.js');
    const MslEntityAuthException = require('../../../../../core/src/main/javascript/MslEntityAuthException.js');
    const MslEncodingException = require('../../../../../core/src/main/javascript/MslEncodingException.js');
    const MslError = require('../../../../../core/src/main/javascript/MslError.js');
    const MslEncoderUtils = require('../../../../../core/src/main/javascript/io/MslEncoderUtils.js');

    const MockMslContext = require('../../../main/javascript/util/MockMslContext.js');
    const MslTestUtils = require('../../../main/javascript/util/MslTestUtils.js');
    
    /** MSL encoder format. */
    var ENCODER_FORMAT = MslEncoderFormat.JSON;
    
    /**
     * Key entity authentication scheme.
     * @const
     * @type {string}
     */
    var KEY_SCHEME = "scheme";
    /**
     * Key entity authentication data.
     * @const
     * @type {string}
     */
    var KEY_AUTHDATA = "authdata";
    
    /**
     * Key master token.
     * @const
     * @type {string}
     */
    var KEY_MASTER_TOKEN = "mastertoken";
    /**
     * Key authentication data.
     * @const
     * @type {string}
     */
    var KEY_AUTHENTICATION_DATA = "authdata";
    /**
     * Key signature.
     * @const
     * @type {string}
     */
    var KEY_SIGNATURE = "signature";
    
    var IDENTITY = "identity";

    /** MSL context. */
    var ctx;
    /** MSL encoder factory. */
    var encoder;
    /** Master token. */
    var masterToken;
    /** Encapsulated entity authentication data. */
    var eAuthdata;
    
    var initialized = false;
    beforeEach(function() {
        if (!initialized) {
            runs(function() {
                MockMslContext.create(EntityAuthenticationScheme.X509, false, {
                    result: function(c) { ctx = c; },
                    error: function(e) { expect(function() { throw e; }).not.toThrow(); },
                });
            });
            waitsFor(function() { return ctx; }, "ctx", 900);
            runs(function() {
                encoder = ctx.getMslEncoderFactory();
                MslTestUtils.getMasterToken(ctx, 1, 1, {
                    result: function(x) { masterToken = x; },
                    error: function(e) { expect(function() { throw e; }).not.toThrow(); },
                });
                eAuthdata = new UnauthenticatedAuthenticationData(IDENTITY);
            });
            waitsFor(function() { return masterToken; }, "master token", 100);
            runs(function() {
                initialized = true;
            });
        }
    });
    
    it("ctors", function() {
        var data;
        runs(function() {
            MasterTokenProtectedAuthenticationData.create(ctx, masterToken, eAuthdata, {
                result: function(x) { data = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return data; }, "data", 100);

        var authdata;
        runs(function() {
            expect(data.getIdentity()).toEqual(eAuthdata.getIdentity());
            expect(data.scheme).toEqual(EntityAuthenticationScheme.MT_PROTECTED);
            expect(data.encapsulatedAuthdata.equals(eAuthdata)).toBeTruthy();
            data.getAuthData(encoder, ENCODER_FORMAT, {
                result: function(x) { authdata = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return authdata; }, "authdata", 100);
        
        var encode;
        runs(function() {
            expect(authdata).not.toBeNull();
            data.toMslEncoding(encoder, ENCODER_FORMAT, {
                result: function(x) { encode = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return encode; }, "encode", 100);
        
        var moData;
        runs(function() {
            expect(encode).not.toBeNull();
       
            MasterTokenProtectedAuthenticationData.parse(ctx, authdata, {
                result: function(x) { moData = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return moData; }, "moData", 100);
        
        var moAuthdata;
        runs(function() {
            expect(moData.getIdentity()).toEqual(data.getIdentity());
            expect(moData.scheme).toEqual(data.scheme);
            expect(moData.encapsulatedAuthdata).toEqual(data.encapsulatedAuthdata);
            moData.getAuthData(encoder, ENCODER_FORMAT, {
                result: function(x) { moAuthdata = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return moAuthdata; }, "moAuthdata", 100);

        runs(function() {
            expect(moAuthdata).not.toBeNull();
            // The authdata will not be equal as it is regenerated.
        });
    });
    
    it("mslobject is correct", function() {
        var data;
        runs(function() {
            MasterTokenProtectedAuthenticationData.create(ctx, masterToken, eAuthdata, {
                result: function(x) { data = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return data; }, "data", 100);
        
        var mo;
        runs(function() {
            MslTestUtils.toMslObject(encoder, data, {
                result: function(x) { mo = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return mo; }, "mo", 100);
        
        var masterTokenMo, authdata;
        runs(function() {
            expect(mo.getString(KEY_SCHEME)).toEqual(EntityAuthenticationScheme.MT_PROTECTED.name);
            authdata = mo.getMslObject(KEY_AUTHDATA, encoder);
            
            MslTestUtils.toMslObject(encoder, masterToken, {
                result: function(x) { masterTokenMo = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return masterTokenMo; }, "masterTokenMo", 100);
        
        runs(function() {
            expect(MslEncoderUtils.equalObjects(masterTokenMo, authdata.getMslObject(KEY_MASTER_TOKEN, encoder))).toBeTruthy();
            // Signature and ciphertext may not be predictable depending on the
            // master token encryption and signature algorithms.
        });
    });
    
    it("create", function() {
        var data;
        runs(function() {
            MasterTokenProtectedAuthenticationData.create(ctx, masterToken, eAuthdata, {
                result: function(x) { data = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return data; }, "data", 100);
        
        var mo;
        runs(function() {
            MslTestUtils.toMslObject(encoder, data, {
                result: function(x) { mo = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return mo; }, "mo", 100);
        
        var entitydata;
        runs(function() {
            EntityAuthenticationData.parse(ctx, mo, {
                result: function(x) { entitydata = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return entitydata; }, "entitydata", 100);
        
        var moAuthdata;
        runs(function() {
            expect(entitydata).not.toBeNull();
            expect(entitydata instanceof MasterTokenProtectedAuthenticationData).toBeTruthy();
            
            var moData = entitydata;
            expect(moData.getIdentity()).toEqual(data.getIdentity());
            expect(moData.scheme).toEqual(data.scheme);
            expect(moData.encapsulatedAuthdata).toEqual(data.encapsulatedAuthdata);
            moData.getAuthData(encoder, ENCODER_FORMAT, {
                result: function(x) { moAuthdata = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return moAuthdata; }, "moAuthdata", 100);
        
        runs(function() {
            expect(moAuthdata).not.toBeNull();
            // The authdata will not be equal as it is regenerated.
        });
    });
    
    it("missing master token", function() {
        var data;
        runs(function() {
            MasterTokenProtectedAuthenticationData.create(ctx, masterToken, eAuthdata, {
                result: function(x) { data = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return data; }, "data", 100);

        var authdata;
        runs(function() {
            data.getAuthData(encoder, ENCODER_FORMAT, {
                result: function(x) { authdata = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return authdata; }, "authdata", 100);
        
        var exception;
        runs(function() {
            authdata.remove(KEY_MASTER_TOKEN);
            MasterTokenProtectedAuthenticationData.parse(ctx, authdata, {
                result: function() {},
                error: function(e) { exception = e; },
            });
        });
        waitsFor(function() { return exception; }, "exception", 100);
        
        runs(function() {
            var f = function() { throw exception; };
            expect(f).toThrow(new MslEncodingException(MslError.MSL_PARSE_ERROR));
        });
    });
    
    it("invalid master token", function() {
        var data;
        runs(function() {
            MasterTokenProtectedAuthenticationData.create(ctx, masterToken, eAuthdata, {
                result: function(x) { data = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return data; }, "data", 100);
        
        var authdata;
        runs(function() {
            data.getAuthData(encoder, ENCODER_FORMAT, {
                result: function(x) { authdata = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return authdata; }, "authdata", 100);

        var exception;
        runs(function() {
            authdata.put(KEY_MASTER_TOKEN, "x");
            MasterTokenProtectedAuthenticationData.parse(ctx, authdata, {
                result: function() {},
                error: function(e) { exception = e; },
            });
        });
        waitsFor(function() { return exception; }, "exception", 100);

        runs(function() {
            var f = function() { throw exception; };
            expect(f).toThrow(new MslEncodingException(MslError.MSL_PARSE_ERROR));
        });
    });
    
    it("corrupt master token", function() {
        var data;
        runs(function() {
            MasterTokenProtectedAuthenticationData.create(ctx, masterToken, eAuthdata, {
                result: function(x) { data = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return data; }, "data", 100);

        var authdata;
        runs(function() {
            data.getAuthData(encoder, ENCODER_FORMAT, {
                result: function(x) { authdata = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return authdata; }, "authdata", 100);
        
        var exception;
        runs(function() {
            authdata.put(KEY_MASTER_TOKEN, new MslObject());
            MasterTokenProtectedAuthenticationData.parse(ctx, authdata, {
                result: function() {},
                error: function(e) { exception = e; },
            });
        });
        waitsFor(function() { return exception; }, "exception", 100);

        runs(function() {
            var f = function() { throw exception; };
            expect(f).toThrow(new MslEntityAuthException(MslError.ENTITYAUTH_MASTERTOKEN_INVALID));
        });
    });
    
    it("missing authdata", function() {
        var data;
        runs(function() {
            MasterTokenProtectedAuthenticationData.create(ctx, masterToken, eAuthdata, {
                result: function(x) { data = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return data; }, "data", 100);

        var authdata;
        runs(function() {
            data.getAuthData(encoder, ENCODER_FORMAT, {
                result: function(x) { authdata = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return authdata; }, "authdata", 100);

        var exception;
        runs(function() {
            authdata.remove(KEY_AUTHENTICATION_DATA);
            MasterTokenProtectedAuthenticationData.parse(ctx, authdata, {
                result: function() {},
                error: function(e) { exception = e; },
            });
        });
        waitsFor(function() { return exception; }, "exception", 100);

        runs(function() {
            var f = function() { throw exception; };
            expect(f).toThrow(new MslEncodingException(MslError.MSL_PARSE_ERROR));
        });
    });
    
    it("invalid authdata", function() {
        var data;
        runs(function() {
            MasterTokenProtectedAuthenticationData.create(ctx, masterToken, eAuthdata, {
                result: function(x) { data = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return data; }, "data", 100);

        var authdata;
        runs(function() {
            data.getAuthData(encoder, ENCODER_FORMAT, {
                result: function(x) { authdata = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return authdata; }, "authdata", 100);

        var exception;
        runs(function() {
            authdata.put(KEY_AUTHENTICATION_DATA, true);
            MasterTokenProtectedAuthenticationData.parse(ctx, authdata, {
                result: function() {},
                error: function(e) { exception = e; },
            });
        });
        waitsFor(function() { return exception; }, "exception", 100);

        runs(function() {
            var f = function() { throw exception; };
            expect(f).toThrow(new MslEncodingException(MslError.MSL_PARSE_ERROR));
        });
    });
    
    xit("corrupt authdata", function() {
        var data;
        runs(function() {
            MasterTokenProtectedAuthenticationData.create(ctx, masterToken, eAuthdata, {
                result: function(x) { data = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return data; }, "data", 100);

        var authdata;
        runs(function() {
            data.getAuthData(encoder, ENCODER_FORMAT, {
                result: function(x) { authdata = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return authdata; }, "authdata", 100);

        var exception;
        runs(function() {
            var corruptAuthdata = new Uint8Array(1);
            corruptAuthdata.set(['x']);
            authdata.put(KEY_AUTHENTICATION_DATA, corruptAuthdata);
            MasterTokenProtectedAuthenticationData.parse(ctx, authdata, {
                result: function() {},
                error: function(e) { exception = e; },
            });
        });
        waitsFor(function() { return exception; }, "exception", 100);

        runs(function() {
            var f = function() { throw exception; };
            expect(f).toThrow(new MslEntityAuthException(MslError.ENTITYAUTH_CIPHERTEXT_INVALID));
        });
    });
    
    it("missing signature", function() {
        var data;
        runs(function() {
            MasterTokenProtectedAuthenticationData.create(ctx, masterToken, eAuthdata, {
                result: function(x) { data = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return data; }, "data", 100);

        var authdata;
        runs(function() {
            data.getAuthData(encoder, ENCODER_FORMAT, {
                result: function(x) { authdata = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return authdata; }, "authdata", 100);

        var exception;
        runs(function() {
            authdata.remove(KEY_SIGNATURE);
            MasterTokenProtectedAuthenticationData.parse(ctx, authdata, {
                result: function() {},
                error: function(e) { exception = e; },
            });
        });
        waitsFor(function() { return exception; }, "exception", 100);

        runs(function() {
            var f = function() { throw exception; };
            expect(f).toThrow(new MslEncodingException(MslError.MSL_PARSE_ERROR));
        });
    });
    
    it("invalid signature", function() {
        var data;
        runs(function() {
            MasterTokenProtectedAuthenticationData.create(ctx, masterToken, eAuthdata, {
                result: function(x) { data = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return data; }, "data", 100);

        var authdata;
        runs(function() {
            data.getAuthData(encoder, ENCODER_FORMAT, {
                result: function(x) { authdata = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return authdata; }, "authdata", 100);

        var exception;
        runs(function() {
            authdata.put(KEY_SIGNATURE, true);
            MasterTokenProtectedAuthenticationData.parse(ctx, authdata, {
                result: function() {},
                error: function(e) { exception = e; },
            });
        });
        waitsFor(function() { return exception; }, "exception", 100);

        runs(function() {
            var f = function() { throw exception; };
            expect(f).toThrow(new MslEncodingException(MslError.MSL_PARSE_ERROR));
        });
    });
    
    xit("corrupt signature", function() {
        var data;
        runs(function() {
            MasterTokenProtectedAuthenticationData.create(ctx, masterToken, eAuthdata, {
                result: function(x) { data = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return data; }, "data", 100);

        var authdata;
        runs(function() {
            data.getAuthData(encoder, ENCODER_FORMAT, {
                result: function(x) { authdata = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return authdata; }, "authdata", 100);

        var exception;
        runs(function() {
            var corruptSignature = new Uint8Array(1);
            corruptSignature.set(['x']);
            authdata.put(KEY_SIGNATURE, corruptSignature);
            MasterTokenProtectedAuthenticationData.parse(ctx, authdata, {
                result: function() {},
                error: function(e) { exception = e; },
            });
        });
        waitsFor(function() { return exception; }, "exception", 100);

        runs(function() {
            var f = function() { throw exception; };
            expect(f).toThrow(new MslEntityAuthException(MslError.ENTITYAUTH_SIGNATURE_INVALID));
        });
    });
    
    it("equals master token", function() {
        var masterTokenB;
        runs(function() {
            MslTestUtils.getMasterToken(ctx, 2, 2, {
                result: function(x) { masterTokenB = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return masterTokenB; }, "master token", 100);
        
        var dataA, dataB;
        runs(function() {
            MasterTokenProtectedAuthenticationData.create(ctx, masterToken, eAuthdata, {
                result: function(x) { dataA = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
            MasterTokenProtectedAuthenticationData.create(ctx, masterTokenB, eAuthdata, {
                result: function(x) { dataB = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return dataA && dataB; }, "dataA && dataB", 100);
        var dataA2;
        runs(function() {
            MslTestUtils.toMslObject(encoder, dataA, {
                result: function(mo) {
                    EntityAuthenticationData.parse(ctx, mo, {
                        result: function(x) { dataA2 = x; },
                        error: function(e) { expect(function() { throw e; }).not.toThrow(); }
                    });
                },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return dataA2; }, "dataA2", 100);
        
        runs(function() {
            expect(dataA.equals(dataA)).toBeTruthy();
            
            expect(dataA.equals(dataB)).toBeFalsy();
            expect(dataB.equals(dataA)).toBeFalsy();
            
            expect(dataA.equals(dataA2)).toBeTruthy();
            expect(dataA2.equals(dataA)).toBeTruthy();
        });
    });
    
    it("equals authdata", function() {
        var eAuthdataB = new UnauthenticatedAuthenticationData(IDENTITY + "B");
        var dataA, dataB;
        runs(function() {
            MasterTokenProtectedAuthenticationData.create(ctx, masterToken, eAuthdata, {
                result: function(x) { dataA = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
            MasterTokenProtectedAuthenticationData.create(ctx, masterToken, eAuthdataB, {
                result: function(x) { dataB = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return dataA && dataB; }, "dataA && dataB", 100);
        var dataA2;
        runs(function() {
            MslTestUtils.toMslObject(encoder, dataA, {
                result: function(mo) {
                    EntityAuthenticationData.parse(ctx, mo, {
                        result: function(x) { dataA2 = x; },
                        error: function(e) { expect(function() { throw e; }).not.toThrow(); }
                    });
                },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return dataA2; }, "dataA2", 100);

        runs(function() {
            expect(dataA.equals(dataA)).toBeTruthy();
            
            expect(dataA.equals(dataB)).toBeFalsy();
            expect(dataB.equals(dataA)).toBeFalsy();
            
            expect(dataA.equals(dataA2)).toBeTruthy();
            expect(dataA2.equals(dataA)).toBeTruthy();
        });
    });
    
    it("equals object", function() {
        var data;
        runs(function() {
            MasterTokenProtectedAuthenticationData.create(ctx, masterToken, eAuthdata, {
                result: function(x) { data = x; },
                error: function(e) { expect(function() { throw e; }).not.toThrow(); }
            });
        });
        waitsFor(function() { return data; }, "data", 100);
        
        runs(function() {
            expect(data.equals(null)).toBeFalsy();
            expect(data.equals(IDENTITY)).toBeFalsy();
        });
    });
});