/**
 * Copyright (c) 2014 Netflix, Inc.  All rights reserved.
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
package server.msg;

/**
 * <p>Thrown if the simple request type cannot be determined.</p>
 * 
 * @author Wesley Miaw <wmiaw@netflix.com>
 */
public class SimpleRequestUnknownException extends Exception {
    private static final long serialVersionUID = -4265148562867961991L;

    /**
     * @param message the exception message.
     */
    public SimpleRequestUnknownException(final String message) {
        super(message);
    }
    
    /**
     * @param message the exception message.
     * @param cause the exception cause.
     */
    public SimpleRequestUnknownException(final String message, final Throwable cause) {
        super(message, cause);
    }
}
