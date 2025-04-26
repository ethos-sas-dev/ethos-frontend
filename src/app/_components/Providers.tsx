'use client'

import { ApolloProvider } from '@apollo/client'
import { AuthProvider } from '../_lib/auth/AuthContext'
import { client } from '../_lib/apollo/apolloClient'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={client}>
      <AuthProvider>{children}</AuthProvider>
    </ApolloProvider>
  )
} 