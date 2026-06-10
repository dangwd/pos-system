export interface Branch {
  id: string
  name: string
  address: string
  phone: string
  isHeadquarters: boolean
  isActive: boolean
}

export interface Counter {
  id: string
  counterName: string
  branchId: string
  isActive: boolean
}

export interface CreateBranchDto {
  name: string
  address: string
  phone: string
  isHeadquarters?: boolean
}

export interface UpdateBranchDto {
  name: string
  address: string
  phone: string
}

export interface CreateCounterDto {
  counterName: string
}

export interface UpdateCounterDto {
  counterName: string
}
