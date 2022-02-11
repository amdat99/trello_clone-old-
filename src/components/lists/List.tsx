import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
// import Slide from "@mui/material/Slide";
import useMediaQuery from "@mui/material/useMediaQuery";
import { DragDropContext, Droppable, DropResult, Draggable } from "react-beautiful-dnd";
import useFetchData from "../../hooks/useFetchData";
import { requestHandler } from "../../helpers/requestHandler";
import TaskModal from "../taskModal/TaskModal";
import ListContent from "./ListContent";
import { CreateVal, Board, User, List as ListType, Task } from "../models";
import { CurrentListId, Params } from "../../pages/board/Board";
import "../../App.css";

type Props = {
  setCurrentResId: ({ id: string, rerender: number }) => void;
  todo: string;
  setTodo: React.Dispatch<React.SetStateAction<string>>;
  currentResId: { id: string; rerender: number };
  stickyMenu: boolean;
  createValue: CreateVal;
  handleAdd: (e: React.FormEvent) => void;
  current: {
    board: Board;
    setBoard: (board: Board) => void;
    list: CurrentListId;
    setList: (list: CurrentListId) => void;
  };
  params: Params;
  user: User;
  position: { x: number; y: number };
  onShowCtxMenu: Function;
};
const List = ({
  todo,
  setTodo,
  stickyMenu,
  createValue,
  onShowCtxMenu,
  handleAdd,
  position,
  currentResId,
  setCurrentResId,
  current,
  params,
  user,
}: Props) => {
  const [todos, setTodos] = useState({});
  const [listData, setListData] = useState(null);

  const {
    data: board,
    fetchData: fetchLists,
    error,
  } = useFetchData(
    { type: "post", route: "board/all", body: current?.board && { id: current.board.id } },
    current.board?.id
  );

  const min1000 = useMediaQuery("(min-width:1000px)");
  const min700 = useMediaQuery("(min-width:700px)");

  useEffect(() => {
    const getLists = () => {
      let currentLists = [];
      if (board && board[0]?.lists) {
        board[0].lists.forEach((list: { id: any }) => {
          //push list data to todos (todos is used as a map to render lists aand tasks)
          setTodos((prevTodos) => ({ ...prevTodos, [list.id]: [] }));
          currentLists.push(list);
        });
        setListData(currentLists);
      }
      if (error?.errors === "no lists found") {
        setTodos({});
        setListData(null);
      }
    };
    getLists();
  }, [board, error, current.board]);

  useEffect(() => {
    if (current.board) {
      fetchLists();
    }
    //es-lint-disable-next-line
  }, [current.board, current.list.rerender]);

  useEffect(() => {
    const createList = () => {
      if (createValue?.name) {
        const id = (Math.random() / Math.random()).toString();
        let currentListsData = listData;
        currentListsData.push({ id, name: createValue.name });
        requestHandler({
          type: "post",
          route: "list/create",
          body: { board_id: current.board.id, name: createValue.name, lists: JSON.stringify(currentListsData), id },
        }).then((response) => {
          if (response === "list created successfully") {
            fetchLists();
          } else {
            alert(response?.errors ? response.errors : "no data found");
          }
        });
      }
    };
    createList();
  }, [current.list.rerender]);

  // handles all drag and drop of tasks and lists and db updates
  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    console.log(result);
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return; // if not dragged to destination then return
    //@ts-ignore
    Array.prototype.insert = function (index: number, item: Task) {
      this.splice(index, 0, item);
    };
    if (source.droppableId === "board") {
      // for list drag and drop
      const sourceData: ListType = listData[source.index];
      const destinationData: ListType = listData[destination.index];
      let currentLists: any = listData;
      // splice current todo to new index and remove duplqicate
      //below code needs to be refactored
      if (source.index > destination.index) {
        currentLists.insert(destination.index, sourceData);
        setListData([...new Set(currentLists)]);
      } else {
        currentLists.insert(destination.index + 1, sourceData);
        currentLists.splice(source.index, 1);
      }
      // update list map json
      requestHandler({
        type: "put",
        route: "list/dragupdate",
        body: {
          id: draggableId,
          board_id: current.board.id,
          lists: JSON.stringify([...new Set(currentLists)]),
        },
      }).then((response) => {
        if (response !== "lists updated successfully") {
          //rollack local index changes if request fails
          currentLists.insert(destination.index, destinationData);
          setListData([...new Set(currentLists)]);
          alert(response?.errors ? response.errors : "no data found");
        } else {
          fetchLists();
        }
      });
    } else {
      const prevId: string = source.droppableId;
      const nextId: string = destination.droppableId;
      const sameList = nextId === prevId;
      let prevName: string = "";
      let nextName: string = "";

      listData.forEach((list: ListType) => {
        if (list.id === nextId) {
          prevName = list.name;
        } else if (list.id === prevId) {
          nextName = list.name;
        }
      });
      // currentTodo is data of task being moved
      const currentTodo: ListType = todos[prevId].slice(source.index, source.index + 1)[0];
      // splice currentTodo to destination list
      const onInsert = (id: string) => {
        let index = source.index > destination.index ? destination.index : destination.index + 1;
        todos[id].insert(sameList ? index : destination.index, currentTodo);
      };
      onInsert(nextId);
      const index = source.index > destination.index ? source.index + 1 : source.index;
      sameList ? todos[prevId].splice(index, 1, 0) : todos[prevId].splice(source.index, 1);
      // update list_id of task in database and update task map json
      requestHandler({
        type: "put",
        route: "task/update",
        body: {
          id: currentTodo.id,
          list_id: nextId,
          prev_listid: prevId,
          prev_listname: prevName ? prevName : "",
          next_listname: nextName ? nextName : "",
          tasks: JSON.stringify(todos[nextId]),
          prev_tasks: JSON.stringify(todos[prevId]),
          name: user.name,
        },
      }).then((response) => {
        if (response !== "task updated successfully") {
          //rollack local changes if request fails
          const index = source.index > destination.index ? source.index + 1 : source.index;
          onInsert(prevId);
          sameList ? todos[nextId].splice(index, 1, 0) : todos[prevId].splice(source.index, 1);
          console.log(response?.errors ? response.errors : "no data found");
        } else {
          //triggers requessts only for the lists where where changes made
          requestHandler({
            type: "post",
            route: "task/pushactivity",
            body: {
              name: user.name,
              color: user.color,
              next_listname: prevName ? prevName : "",
              prev_listname: nextName ? nextName : "",
              id: currentTodo.id,
            },
          });
          setCurrentResId({ id: nextId, rerender: 1 });
          setCurrentResId({ id: prevId, rerender: 2 });
        }
      });
    }
  };

  const setUrl = (taskId: string) => {
    const { navigate, orgName, board } = params;
    navigate(`/board/${orgName}?board=${board}${taskId ? `&task=${taskId}` : ""}`);
  };
  return (
    <>
      {params.taskId && (
        <TaskModal
          taskId={params.taskId}
          setUrl={setUrl}
          position={position}
          user={user}
          todos={todos}
          setCurrentResId={setCurrentResId}
          onShowCtxMenu={onShowCtxMenu}
        />
      )}
      <DragDropContext onDragEnd={onDragEnd}>
        <Box m={2} ml={stickyMenu && min700 ? 27 : 4} width={min1000 ? (stickyMenu ? "95%" : "105%") : "95%"}>
          <Typography variant="h4" color={"white"} sx={{ ml: 0.8 }}>
            {current.board ? current.board?.name : "Board"}
          </Typography>
          {/* // for reference */}
          {/* <button onClick={handleAdd} className="input_submit">
          Add
        </button> */}
          <div>
            <Droppable droppableId="board" type="ROW" direction="horizontal">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="container ">
                  {/* //causes issues with drag drop */}
                  {/* <> {provided.placeholder}</> */}
                  {listData &&
                    listData.map((list: ListType, i: number) => (
                      <Draggable key={list.id} draggableId={list.id.toString()} index={i}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`todos hide-scroll`}
                          >
                            <Droppable key={list?.id} droppableId={list?.id} type="COLUMN" direction="vertical">
                              {(provided, _snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  style={{ display: "flex", flexDirection: "column" }}
                                >
                                  <Typography sx={{ opacity: 0.95 }}>{list.name}</Typography>
                                  <ListContent
                                    list={list}
                                    current={current}
                                    lists={listData}
                                    todo={todo}
                                    setTodo={setTodo}
                                    handleAdd={handleAdd}
                                    todos={todos}
                                    setTodos={setTodos}
                                    currentResId={currentResId}
                                    provided={provided}
                                    setUrl={setUrl}
                                  />
                                </div>
                              )}
                            </Droppable>
                          </div>
                        )}
                      </Draggable>
                    ))}
                </div>
              )}
            </Droppable>
          </div>
        </Box>
      </DragDropContext>
    </>
  );
};

export default List;
