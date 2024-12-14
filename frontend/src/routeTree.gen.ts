/* prettier-ignore-start */

/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file is auto-generated by TanStack Router

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as AuthImport } from './routes/auth'
import { Route as AuthenticatedImport } from './routes/_authenticated'
import { Route as AuthenticatedIndexImport } from './routes/_authenticated/index'
import { Route as OauthSuccessImport } from './routes/oauth/success'
import { Route as AuthenticatedSearchImport } from './routes/_authenticated/search'
import { Route as AuthenticatedIntegrationsImport } from './routes/_authenticated/integrations'
import { Route as AuthenticatedChatImport } from './routes/_authenticated/chat'
import { Route as AuthenticatedChatChatIdImport } from './routes/_authenticated/chat.$chatId'
import { Route as AuthenticatedAdminIntegrationsImport } from './routes/_authenticated/admin/integrations'

// Create/Update Routes

const AuthRoute = AuthImport.update({
  path: '/auth',
  getParentRoute: () => rootRoute,
} as any)

const AuthenticatedRoute = AuthenticatedImport.update({
  id: '/_authenticated',
  getParentRoute: () => rootRoute,
} as any)

const AuthenticatedIndexRoute = AuthenticatedIndexImport.update({
  path: '/',
  getParentRoute: () => AuthenticatedRoute,
} as any)

const OauthSuccessRoute = OauthSuccessImport.update({
  path: '/oauth/success',
  getParentRoute: () => rootRoute,
} as any)

const AuthenticatedSearchRoute = AuthenticatedSearchImport.update({
  path: '/search',
  getParentRoute: () => AuthenticatedRoute,
} as any)

const AuthenticatedIntegrationsRoute = AuthenticatedIntegrationsImport.update({
  path: '/integrations',
  getParentRoute: () => AuthenticatedRoute,
} as any)

const AuthenticatedChatRoute = AuthenticatedChatImport.update({
  path: '/chat',
  getParentRoute: () => AuthenticatedRoute,
} as any)

const AuthenticatedChatChatIdRoute = AuthenticatedChatChatIdImport.update({
  path: '/$chatId',
  getParentRoute: () => AuthenticatedChatRoute,
} as any)

const AuthenticatedAdminIntegrationsRoute =
  AuthenticatedAdminIntegrationsImport.update({
    path: '/admin/integrations',
    getParentRoute: () => AuthenticatedRoute,
  } as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/_authenticated': {
      id: '/_authenticated'
      path: ''
      fullPath: ''
      preLoaderRoute: typeof AuthenticatedImport
      parentRoute: typeof rootRoute
    }
    '/auth': {
      id: '/auth'
      path: '/auth'
      fullPath: '/auth'
      preLoaderRoute: typeof AuthImport
      parentRoute: typeof rootRoute
    }
    '/_authenticated/chat': {
      id: '/_authenticated/chat'
      path: '/chat'
      fullPath: '/chat'
      preLoaderRoute: typeof AuthenticatedChatImport
      parentRoute: typeof AuthenticatedImport
    }
    '/_authenticated/integrations': {
      id: '/_authenticated/integrations'
      path: '/integrations'
      fullPath: '/integrations'
      preLoaderRoute: typeof AuthenticatedIntegrationsImport
      parentRoute: typeof AuthenticatedImport
    }
    '/_authenticated/search': {
      id: '/_authenticated/search'
      path: '/search'
      fullPath: '/search'
      preLoaderRoute: typeof AuthenticatedSearchImport
      parentRoute: typeof AuthenticatedImport
    }
    '/oauth/success': {
      id: '/oauth/success'
      path: '/oauth/success'
      fullPath: '/oauth/success'
      preLoaderRoute: typeof OauthSuccessImport
      parentRoute: typeof rootRoute
    }
    '/_authenticated/': {
      id: '/_authenticated/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof AuthenticatedIndexImport
      parentRoute: typeof AuthenticatedImport
    }
    '/_authenticated/admin/integrations': {
      id: '/_authenticated/admin/integrations'
      path: '/admin/integrations'
      fullPath: '/admin/integrations'
      preLoaderRoute: typeof AuthenticatedAdminIntegrationsImport
      parentRoute: typeof AuthenticatedImport
    }
    '/_authenticated/chat/$chatId': {
      id: '/_authenticated/chat/$chatId'
      path: '/$chatId'
      fullPath: '/chat/$chatId'
      preLoaderRoute: typeof AuthenticatedChatChatIdImport
      parentRoute: typeof AuthenticatedChatImport
    }
  }
}

// Create and export the route tree

export const routeTree = rootRoute.addChildren({
  AuthenticatedRoute: AuthenticatedRoute.addChildren({
    AuthenticatedChatRoute: AuthenticatedChatRoute.addChildren({
      AuthenticatedChatChatIdRoute,
    }),
    AuthenticatedIntegrationsRoute,
    AuthenticatedSearchRoute,
    AuthenticatedIndexRoute,
    AuthenticatedAdminIntegrationsRoute,
  }),
  AuthRoute,
  OauthSuccessRoute,
})

/* prettier-ignore-end */

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/_authenticated",
        "/auth",
        "/oauth/success"
      ]
    },
    "/_authenticated": {
      "filePath": "_authenticated.tsx",
      "children": [
        "/_authenticated/chat",
        "/_authenticated/integrations",
        "/_authenticated/search",
        "/_authenticated/",
        "/_authenticated/admin/integrations"
      ]
    },
    "/auth": {
      "filePath": "auth.tsx"
    },
    "/_authenticated/chat": {
      "filePath": "_authenticated/chat.tsx",
      "parent": "/_authenticated",
      "children": [
        "/_authenticated/chat/$chatId"
      ]
    },
    "/_authenticated/integrations": {
      "filePath": "_authenticated/integrations.tsx",
      "parent": "/_authenticated"
    },
    "/_authenticated/search": {
      "filePath": "_authenticated/search.tsx",
      "parent": "/_authenticated"
    },
    "/oauth/success": {
      "filePath": "oauth/success.tsx"
    },
    "/_authenticated/": {
      "filePath": "_authenticated/index.tsx",
      "parent": "/_authenticated"
    },
    "/_authenticated/admin/integrations": {
      "filePath": "_authenticated/admin/integrations.tsx",
      "parent": "/_authenticated"
    },
    "/_authenticated/chat/$chatId": {
      "filePath": "_authenticated/chat.$chatId.tsx",
      "parent": "/_authenticated/chat"
    }
  }
}
ROUTE_MANIFEST_END */
