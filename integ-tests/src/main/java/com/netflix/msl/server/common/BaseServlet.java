/**
 * Copyright (c) 2014-2017 Netflix, Inc.  All rights reserved.
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
package com.netflix.msl.server.common;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.PrintWriter;
import java.security.InvalidAlgorithmParameterException;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.concurrent.Future;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import com.netflix.msl.MslConstants;
import com.netflix.msl.MslCryptoException;
import com.netflix.msl.MslEncodingException;
import com.netflix.msl.MslKeyExchangeException;
import com.netflix.msl.entityauth.EntityAuthenticationScheme;
import com.netflix.msl.keyx.KeyExchangeScheme;
import com.netflix.msl.msg.ConsoleFilterStreamFactory;
import com.netflix.msl.msg.MessageInputStream;
import com.netflix.msl.msg.MslControl;
import com.netflix.msl.server.configuration.msg.ServerMessageContext;
import com.netflix.msl.server.configuration.tokens.TokenFactoryType;
import com.netflix.msl.server.configuration.util.ServerMslContext;
import com.netflix.msl.userauth.UserAuthenticationScheme;

/**
 * User: skommidi
 * Date: 7/21/14
 */
public class BaseServlet extends HttpServlet {

    private static final long serialVersionUID = 1L;
    private static final boolean debug = false;
    protected static final String payload = "Hello";
    protected static final String error = "Error";
    private static final int TIMEOUT = 25000;
    private boolean isNullCryptoContext;
    private boolean setConsoleFilterStreamFactory;
    private EntityAuthenticationScheme entityAuthScheme;
    private int numThreads;
    private TokenFactoryType tokenFactoryType;
    private long initialSequenceNum;
    private boolean isMessageEncrypted;
    private boolean isIntegrityProtected;
    private final List<EntityAuthenticationScheme> unSupportedEntityAuthFactories;
    private final List<UserAuthenticationScheme> unSupportedUserAuthFactories;
    private final List<KeyExchangeScheme> unSupportedKeyxFactories;
    protected ServerMslContext mslCtx;
    protected ServerMessageContext msgCtx;
    private MslControl mslCtrl;

    public BaseServlet(final int numThreads, final EntityAuthenticationScheme entityAuthScheme, final TokenFactoryType tokenFactoryType,
                       final long initialSequenceNum, final boolean isMessageEncrypted, final boolean isIntegrityProtected,
                       final List<EntityAuthenticationScheme> unSupportedEntityAuthFactories,
                       final List<UserAuthenticationScheme> unSupportedUserAuthFactories, final List<KeyExchangeScheme> unSupportedKeyxFactories,
                       final boolean isNullCryptoContext, final boolean setConsoleFilterStreamFactory) throws MslCryptoException, MslEncodingException, InvalidAlgorithmParameterException, NoSuchAlgorithmException, MslKeyExchangeException {
        this.numThreads = numThreads;
        this.entityAuthScheme = entityAuthScheme;
        this.tokenFactoryType = tokenFactoryType;
        this.initialSequenceNum = initialSequenceNum;
        this.isMessageEncrypted = isMessageEncrypted;
        this.isIntegrityProtected = isIntegrityProtected;
        this.unSupportedEntityAuthFactories = unSupportedEntityAuthFactories;
        this.unSupportedUserAuthFactories = unSupportedUserAuthFactories;
        this.unSupportedKeyxFactories = unSupportedKeyxFactories;
        this.isNullCryptoContext = isNullCryptoContext;
        this.setConsoleFilterStreamFactory = setConsoleFilterStreamFactory;
        configure();
    }

    private void configure() throws MslCryptoException, InvalidAlgorithmParameterException, NoSuchAlgorithmException, MslKeyExchangeException, MslEncodingException {
        mslCtrl = new MslControl(numThreads);
        if(setConsoleFilterStreamFactory) {
            mslCtrl.setFilterFactory(new ConsoleFilterStreamFactory());
        }
        /**
         * Msl Context Configuration
         */
        mslCtx = new ServerMslContext(entityAuthScheme, false, tokenFactoryType, initialSequenceNum, unSupportedEntityAuthFactories,
                unSupportedUserAuthFactories, unSupportedKeyxFactories, isNullCryptoContext);

        /**
         * Message Context Configuration
         */
        msgCtx = new ServerMessageContext(mslCtx, payload.getBytes(MslConstants.DEFAULT_CHARSET), isMessageEncrypted);
        msgCtx.setIntegrityProtected(isIntegrityProtected);
    }

    @Override
    protected void service(final HttpServletRequest request, final HttpServletResponse response) throws ServletException, IOException {
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type");

        super.service(request, response);
    }

    @Override
    protected void doGet(final HttpServletRequest request, final HttpServletResponse response) throws ServletException, IOException {
        final PrintWriter out = response.getWriter();

        @SuppressWarnings("unchecked")
        final
        Map<String, String[]> params = request.getParameterMap();
        for (final Entry<String,String[]> entry : params.entrySet()) {
            try {
                final String key = entry.getKey();
                final String[] value = entry.getValue();
                setPrivateVariable(out, key, value);
            } catch (final Exception e) {
                if (debug)
                    e.printStackTrace();
                out.println(e.getMessage());
            }
        }
        try {
            configure();
        } catch (final Exception e) {
            if (debug)
                e.printStackTrace();
            out.println(e.getMessage());
        }
        out.println(request.getServletPath());
        out.close();
    }

    @Override
    protected void doPost(final HttpServletRequest request, final HttpServletResponse response) throws IOException {
        final InputStream inStream = request.getInputStream();
        final OutputStream outStream = response.getOutputStream();
        InputStream mslInputStream = null;


        final byte[] buffer = new byte[5];

        try {
            final Future<MessageInputStream> msgInputStream = mslCtrl.receive(mslCtx, msgCtx, inStream, outStream, TIMEOUT);

            mslInputStream = msgInputStream.get();
            if (mslInputStream == null) return;

            do {
                final int bytesRead = mslInputStream.read(buffer);
                if (bytesRead == -1) break;
            } while (true);

            //Checking the the received payload is the same as the one the client sent
            if (!Arrays.equals(payload.getBytes(MslConstants.DEFAULT_CHARSET), buffer)) {
                msgCtx.setBuffer(error.getBytes(MslConstants.DEFAULT_CHARSET));
                mslCtrl.respond(mslCtx, msgCtx, inStream, outStream, msgInputStream.get(), TIMEOUT);
                throw new IllegalStateException("PayloadBytes is not as expected: " + Arrays.toString(buffer));
            }
            msgCtx.setBuffer(buffer);
            mslCtrl.respond(mslCtx, msgCtx, inStream, outStream, msgInputStream.get(), TIMEOUT);

        } catch (final Exception ex) {
            if (debug)
                ex.printStackTrace(System.out);
        } finally {
            if (mslInputStream != null) {
                mslInputStream.close();
            }
        }
    }

    private void setPrivateVariable(final PrintWriter out, final String key, final String[] values) throws Exception {
        if (key.equals("numthreads")) {
            this.numThreads = Integer.parseInt(values[0]);
            out.println(key + ": " + values[0]);
        } else if (key.equals("entityauthscheme")) {
            this.entityAuthScheme = EntityAuthenticationScheme.getScheme(values[0]);
            out.println(key + ": " + values[0]);
        } else if (key.equals("tokenfactorytype")) {
            this.tokenFactoryType = TokenFactoryType.valueOf(values[0]);
            out.println(key + ": " + values[0]);
        } else if (key.equals("initialseqnum")) {
            this.initialSequenceNum = Long.parseLong(values[0]);
            out.println(key + ": " + values[0]);
        } else if (key.equals("encrypted")) {
            this.isMessageEncrypted = Boolean.parseBoolean(values[0]);
            out.println(key + ": " + values[0]);
        } else if (key.equals("intProtected")) {
            this.isIntegrityProtected = Boolean.parseBoolean(values[0]);
            out.println(key + ": " + values[0]);
        } else if(key.equals("consoleFilterStreamFactory")) {
            this.setConsoleFilterStreamFactory = Boolean.parseBoolean(values[0]);
            out.println(key + ": " + values[0]);
        } else if(key.equals("nullCryptoContext")) {
            this.isNullCryptoContext = Boolean.parseBoolean(values[0]);
            out.println(key + ":" + values[0]);
        } else if (key.equals("unsupentityauthfact")) {
            this.unSupportedEntityAuthFactories.clear();
            for (final String entityAuth : values) {
                this.unSupportedEntityAuthFactories.add(EntityAuthenticationScheme.getScheme(entityAuth));
                out.println(key + ": " + entityAuth);
            }
        } else if (key.equals("unsupuserauthfact")) {
            this.unSupportedUserAuthFactories.clear();
            for (final String userAuth : values) {
                this.unSupportedUserAuthFactories.add(UserAuthenticationScheme.getScheme(userAuth));
                out.println(key + ": " + userAuth);
            }
        } else if (key.equals("unsupkeyexfact")) {
            this.unSupportedKeyxFactories.clear();
            for (final String keyEx : values) {
                this.unSupportedKeyxFactories.add(KeyExchangeScheme.getScheme(keyEx));
                out.println(key + ": " + keyEx);
            }
        } else {
            throw new Exception("Invalid parameter: " + key);
        }
    }


    protected String getBody(final HttpServletRequest request) throws IOException {

        String body = null;
        final StringBuilder stringBuilder = new StringBuilder();
        BufferedReader bufferedReader = null;

        try {
            final InputStream inputStream = request.getInputStream();
            if (inputStream != null) {
                bufferedReader = new BufferedReader(new InputStreamReader(inputStream, MslConstants.DEFAULT_CHARSET));
                bufferedReader.mark(100000);
                final char[] charBuffer = new char[128];
                int bytesRead = -1;
                while ((bytesRead = bufferedReader.read(charBuffer)) > 0) {
                    stringBuilder.append(charBuffer, 0, bytesRead);
                }
                bufferedReader.reset();
            } else {
                stringBuilder.append("");
            }
        } catch (final IOException ex) {
            throw ex;
        } finally {
            if (bufferedReader != null) {
                try {
                    bufferedReader.close();
                } catch (final IOException ex) {
                    throw ex;
                }
            }
        }

        body = stringBuilder.toString();
        return body;
    }
}
