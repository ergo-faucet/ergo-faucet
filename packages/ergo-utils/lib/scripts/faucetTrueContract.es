{
  val total = 0L
  val totalErgs = INPUTS.fold(0L, {(total: Long, box: Box) => total + box.value})


  val inputTokens = INPUTS.fold(
    Coll[(Coll[Byte], Long)](),
   { (acc : Coll[(Coll[Byte], Long)], box : Box) => {
      box.tokens.fold(
        acc,
      {  (innerAcc : Coll[(Coll[Byte], Long)], token:(Coll[Byte], Long)) => {
          val id = token._1
          val amount = token._2
          if (innerAcc.exists({ (t:(Coll[Byte], Long)) => t._1 == id })) {
            // token exists: replace or add
            innerAcc.map { (t:(Coll[Byte], Long)) =>
              if (t._1 == id) (t._1, t._2 + amount)
              else t
            }
          } else {
            // token doesn't exist: append
            innerAcc.append(Coll((id, amount)))
          }
        }}
      )
    }}
  )

  val outTokens = OUTPUTS(0).tokens

  val allTokensExist = inputTokens.forall { (t:(Coll[Byte], Long)) =>
    val id = t._1
    val amount = t._2
    outTokens.exists { (o:(Coll[Byte], Long)) =>
      o._1 == id && o._2 == amount
    }
  }

    sigmaProp(allOf(Coll(
    HEIGHT > index,
    OUTPUTS(0).propositionBytes == ownerPK.propBytes,
    OUTPUTS(0).value == (totalErgs - MIN_FEE), 
    allTokensExist,
    faucetPK || ownerPK,
  )))


}