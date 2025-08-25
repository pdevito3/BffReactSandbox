import { queryOptions } from '@tanstack/react-query'
import { notFound } from '@tanstack/react-router'
import axios from 'redaxios'

export type User = {
  id: number
  name: string
  email: string
}

export const fetchUsers = async () => {
  console.info('Fetching users...')
  const res = await axios.get<Array<User>>(
    'https://jsonplaceholder.typicode.com/users',
  )
  
  const list = res.data.slice(0, 10)
  return list.map((u) => ({ id: u.id, name: u.name, email: u.email }))
}

export const usersQueryOptions = () =>
  queryOptions({
    queryKey: ['users'],
    queryFn: () => fetchUsers(),
  })

export const fetchUser = async (id: string) => {
  console.info(`Fetching user with id ${id}...`)
  try {
    const res = await axios.get<User>(
      'https://jsonplaceholder.typicode.com/users/' + id,
    )

    return {
      id: res.data.id,
      name: res.data.name,
      email: res.data.email,
    }
  } catch (err: any) {
    console.error(err)
    if (err.status === 404) {
      throw notFound()
    }
    throw new Error('Failed to fetch user')
  }
}

export const userQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ['users', id],
    queryFn: () => fetchUser(id),
  })
