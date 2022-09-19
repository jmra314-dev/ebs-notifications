export const QUERY=`
query(
  $filters:[FilterInput],
  $sort:[SortInput]
  ){
  findJobLogList(
    filters:$filters,
    sort:$sort) {
      totalPages
      totalElements
        content{
              id
              contacts{
                id
                person{
                  givenName
                  familyName
                }
              }
              message
              startTime
              endTime
              status
              jobWorkflow{
                id
                jobType{
                  id
                  name
                }
            }     
            }        
  }

}
`;
export const MUTATION_MODIFY=`
mutation($jobLog:JobLogInput!){
     modifyJobLog(jobLog:$jobLog)
              {
              id
              }
}

`;