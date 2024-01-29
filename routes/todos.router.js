import express from "express";
import joi from "joi";
import Todo from "../schemas/todo.schema.js";

const router = express.Router();

// 1. `value` 데이터는 **필수적으로 존재**해야한다.
// 2. `value` 데이터는 **문자열 타입**이어야한다.
// 3. `value` 데이터는 **최소 1글자 이상**이어야한다.
// 4. `value` 데이터는 **최대 50글자 이하**여야한다.
// 5. 유효성 검사에 실패했을 때, 에러가 발생해야한다.

const createdTodoschema = joi.object({
  value: joi.string().min(1).max(50).required(),
});

/** 할 일 등록 API **/
router.post("/todos", async (req, res, next) => {
  try {
    // 1. 클라이언트로 부터 받아온 value 데이터를 가져온다.
    // const { value } = req.body;

    const validation = await createdTodoschema.validateAsync(req.body);
    const { value } = validation;

    // 1-5. 만약, 클라이언트가 value 데이터를 전달하지 않았을 때 (value가 존재하지 않을 때),
    // 클라이언트에게 에러 메시지를 전달합니다.

    if (!value) {
      return res
        .status(400)
        .json({ errorMessage: "해야할 일 데이터가 존재하지 않습니다." });
    }

    // 2. 해당하는 마지막 order 데이터를 조회한다.
    // .findOne() = 1개의 데이터만 조회한다.
    // sort = 정렬한다 -> 어떤 컬럼을? order (-) 붙여서 내림차순으로
    const todoMaxOrder = await Todo.findOne().sort("-order").exec();

    // 3. 만약 존재한다면 현재 해야할 일을 +1하고, order 데이터가 존재하지 않다면, 1로 할당한다.
    const order = todoMaxOrder ? todoMaxOrder.order + 1 : 1;

    // 4. 해야할 일 등록
    const todo = new Todo({ value, order }); // todo를 실제 인스턴스 형식으로 만든 것
    await todo.save(); // -> 입력해야지만 실제로 데이터베이스에 저장이 됨

    // 5. 해야할 일을 클라이언트에게 반환한다.
    return res.status(201).json({ todo: todo });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

/** 해야할 일 목록 조회 api **/
router.get("/todos", async (req, res, next) => {
  // 1. 해야할 일 목록 조회를 진행한다.
  // Todo모델을 이용해, MongoDB에서 'order' 값이 가장 높은 '해야할 일'을 찾습니다.
  const todos = await Todo.find().sort("-order").exec();

  // 2. 해야할 일 목록 조회 결과를 클라이언트에게 반환한다.
  // 찾은 '해야할 일'을 클라이언트에게 전달합니다.
  return res.status(200).json({ todos });
});

/** 해야할 일 순서 변경, 완료/해제, 내용 변경 API **/
router.patch("/todos/:todoId", async (req, res, next) => {
  // 변경할 '해야할 일'의 ID 값을 가져옵니다.
  const { todoId } = req.params;
  // '해야할 일'을 몇번째 순서로 설정할 지 order 값을 가져옵니다.
  const { order, done, value } = req.body;

  // 현재 나의 order가 무엇인지 알아야한다
  const currentTodo = await Todo.findById(todoId).exec();
  if (!currentTodo) {
    return res
      .status(404)
      .json({ errorMessage: "존재하지 않는 해야할 일입니다" });
  }

  if (order) {
    // 변경하려는 order 값을 가지고 있는 '해야할 일'을 찾습니다.
    const targetTodo = await Todo.findOne({ order }).exec();
    if (targetTodo) {
      // 만약, 이미 해당 order 값을 가진 '해야할 일'이 있다면, 해당 '해야할 일'의 order 값을 변경하고 저장합니다.
      targetTodo.order = currentTodo.order;
      await targetTodo.save();
    }
    // 변경하려는 '해야할 일'의 order 값을 변경합니니다.
    currentTodo.order = order;
  }
  if (done !== undefined) {
    // 변경하려는 '해야할 일'의 doneAt 값을 변경합니다.
    currentTodo.doneAt = done ? new Date() : null;
  }
  if (value) {
    // 변경하려는 '해야할 일'의 내용을 변경합니다.
    currentTodo.value = value;
  }
  // 변경된 '해야할 일'을 저장합니다.
  await currentTodo.save();
  return res.status(200).json({});
});

/** 할 일 삭제 **/
router.delete("/todos/:todoId", async (req, res, next) => {
  // 삭제할 '해야할 일'의 ID 값을 가져옵니다.
  const { todoId } = req.params;

  // 삭제하려는 '해야할 일'을 가져옵니다. 만약, 해당 ID값을 가진 '해야할 일'이 없다면 에러를 발생시킵니다.
  const todo = await Todo.findById(todoId).exec();
  if (!todo) {
    return res
      .status(404)
      .json({ errorMessage: "존재하지 않는 해야할 일 정보입니다." });
  }

  // 조회된 '해야할 일'을 삭제합니다.
  await Todo.deleteOne({ _id: todoId }).exec();
  return res.status(200).json({});
});

export default router;
