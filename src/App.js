import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';
import ReactTable from 'react-table';
import 'react-table/react-table.css';
import checkboxHOC from "react-table/lib/hoc/selectTable";
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import 'react-tabs/style/react-tabs.css';

const CheckboxTable = checkboxHOC(ReactTable);

const FEED_DATA_SERVER = "192.168.1.69:8080";

class App extends Component {
  constructor() {
    super();

    const columns = [
      {
        Header: 'Image', accessor: 'img_src', maxWidth: 130,
        Cell: row => (<img className="App-Article-img" src={row.value} alt="Article" />)
      },
      { Header: 'Title', accessor: 'title' },
      { Header: 'Price', accessor: 'price', maxWidth: 100 },
      {
        Header: 'Link', accessor: 'link', maxWidth: 60,
        Cell: row => (<button onClick={() => window.open(row.value, "_blank")}>Open</button>)
      }
    ];

    this.state = {
      columns,
      selection: [],
      selectAll: false
    }
  }

  componentDidMount() {
    this.listArticles();
  }

  removeDuplicates(myArr, prop) {
    return myArr.filter((obj, pos, arr) => {
      return arr.map(mapObj => mapObj[prop]).indexOf(obj[prop]) === pos;
    });
  }

  listArticles(list_marked = true) {
    // Get all ids on the server.
    fetch("http://" + FEED_DATA_SERVER + "/marked_ids", {
      method: "GET",
      mode: "cors", // or without this line
      redirect: 'follow',
      headers: {
        'content-type': 'application/json'
      }
    }).then((response) => response.json())
      .then((marked_ids_obj) => {
        const marked_ids = marked_ids_obj.map(id_obj => id_obj['id']);

        fetch('./olx_feed.jl')
          .then(response => response.text())
          .then(text => {
            const lines = text.split('\n');

            var json_str = '[';
            lines.forEach(line => json_str += line + ',');
            json_str = json_str.substr(0, json_str.length - 2);
            json_str += ']';

            return JSON.parse(json_str);
          })
          .then(data => {
            const unmarked_articles = this.removeDuplicates(data
              .filter(item => {
                const id = item['_id'];

                return !marked_ids.includes(id);
              }), '_id');

            const marked_articles = this.removeDuplicates(data
              .filter(item => {
                const id = item['_id'];

                return marked_ids.includes(id);
              }), '_id');

            this.setState({ unmarked_articles, marked_articles });
          })
          .catch(error => console.log(error));
      })
      .catch((response) => console.error("Fail to get feed data: " + response));
  }

  toggleSelection = (key, shift, row) => {
    // start off with the existing state
    let selection = [...this.state.selection];
    const keyIndex = selection.indexOf(key);
    // check to see if the key exists
    if (keyIndex >= 0) {
      // it does exist so we will remove it using destructing
      selection = [
        ...selection.slice(0, keyIndex),
        ...selection.slice(keyIndex + 1)
      ];
    } else {
      // it does not exist so add it
      selection.push(key);
    }
    // update the state
    this.setState({ selection });
  };

  toggleAll = () => {
    const selectAll = this.state.selectAll ? false : true;
    const selection = [];
    if (selectAll) {
      // we need to get at the internals of ReactTable
      const wrappedInstance = this.checkboxTable.getWrappedInstance();
      // the 'sortedData' property contains the currently accessible records based on the filter and sort
      const currentRecords = wrappedInstance.getResolvedState().sortedData;
      // we just push all the IDs onto the selection array
      currentRecords.forEach(item => {
        selection.push(item._original._id);
      });
    }
    this.setState({ selectAll, selection });
  };

  isSelected = key => {
    return this.state.selection.includes(key);
  };

  markRead = () => {
    this.state.selection.forEach(id => {
      const body = JSON.stringify({ id });

      fetch("http://" + FEED_DATA_SERVER + "/marked_ids", {
        "body": body,
        "headers": {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Charset": "UTF-8"
        },
        "method": "POST"
      })
        .then((response) => this.listArticles())
        .catch((reason) => console.error(reason));
    });
  };

  unmarkRead = () => {
    this.state.selection.forEach(id => {
      fetch("http://" + FEED_DATA_SERVER + "/marked_ids/" + id, {
        "method": "DELETE"
      })
        .then((response) => this.listArticles())
        .catch((reason) => console.error(reason));
    });
  };

  render() {
    const { toggleSelection, toggleAll, isSelected, markRead, unmarkRead } = this;
    const { columns, unmarked_articles, marked_articles, selectAll } = this.state;

    const checkboxProps = {
      selectAll,
      isSelected,
      toggleSelection,
      toggleAll,
      selectType: "checkbox",
      getTrProps: (s, r) => {
        const selected = r && this.isSelected(r.original._id);
        return {
          style: {
            backgroundColor: selected ? "lightgreen" : "inherit"
          }
        };
      }
    };

    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Viewer</h1>
        </header>

        <Tabs>
          <TabList>
            <Tab>Unmarked</Tab>
            <Tab>Marked</Tab>
          </TabList>

          <TabPanel>
            <button onClick={markRead}>Mark Read</button>

            {this.state &&
              <CheckboxTable
                ref={r => (this.checkboxTable = r)}
                data={unmarked_articles}
                columns={columns}
                defaultPageSize={10}
                className="-striped -highlight"
                {...checkboxProps}
              />
            }
          </TabPanel>
          <TabPanel>
            <button onClick={unmarkRead}>Unmark Read</button>

            {this.state &&
              <CheckboxTable
                ref={r => (this.checkboxTable = r)}
                data={marked_articles}
                columns={columns}
                defaultPageSize={10}
                className="-striped -highlight"
                {...checkboxProps}
              />
            }
          </TabPanel>
        </Tabs>
      </div>
    );
  }
}

export default App;
