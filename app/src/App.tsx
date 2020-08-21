import React, {useState, useEffect} from 'react'
import Graphin from '@antv/graphin'
import {Input} from 'antd'
import Graph from '@antv/graphin/dist/Graphin'
const {Search} = Input

interface GraphData {
  nodes: any[]
  edges: any[]
}

const colors = {
  Major: 'blue',
  Industry: 'gray',
  Product: 'yellow',
  Skill: 'green',
  Company: 'red',
  Job: 'cyan',
}

function App() {
  const [loading, setLoading] = useState(false)
  const toggleLoading = () => setLoading((loading) => !loading)
  const [data, setData] = useState<GraphData>({nodes: [], edges: []})
  const graphRef = React.createRef<Graph>()
  const searchName = async (name: string) => {
    const response = await fetch(`http://localhost:3000/entity?name=${name}`)
    const json = await response.json()
    const newData = {
      nodes: json.nodes.map((node: any) => ({
        id: `node-${node.identity.low}`,
        label: node.properties.name,
        data: {
          label: node.labels[0],
          ...node.properties,
        },
        style: {
          primaryColor: (colors as any)[node.labels[0]],
        },
      })),
      edges: json.edges.map((edge: any) => ({
        id: `edge-${edge.identity.low}`,
        source: `node-${edge.start.low}`,
        target: `node-${edge.end.low}`,
        label: edge.type,
        data: {},
      })),
    }
    return newData
  }
  const onSearch = async (value: string) => {
    toggleLoading()
    try {
      setData(await searchName(value))
    } catch (e) {
      console.error(e)
    } finally {
      toggleLoading()
    }
  }

  useEffect(() => {
    const {graph} = graphRef.current as any
    const handleNodeClick = async (e: any) => {
      setData(await searchName(e.item.get('model').label))
    }
    graph.on('node:dblclick', handleNodeClick)
    return () => {
      graph.off('node:dblclick', handleNodeClick)
    }
  }, [data, graphRef])

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          marginTop: '30px',
          width: '30vw',
        }}
      >
        <Search
          placeholder="请输入内容……"
          loading={loading}
          enterButton
          onSearch={onSearch}
        />
      </div>
      <Graphin data={data} ref={graphRef} />
    </div>
  )
}

export default App
